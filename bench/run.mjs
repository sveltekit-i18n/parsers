// Runs the benchmark of the package it is started from: `npm run bench`
// measures that package, and `npm run bench -- --compare <dir>` measures it
// against the same package checked out at `<dir>` (master, in CI), printing a
// table of both. Node runs this file as it is, so it is plain JavaScript and
// imports nothing but Node's own modules: the repository root has no install.
//
//   --compare <dir>   the package root to measure against, installed
//   --samples <n>     processes per side for the time rows (default 5)
//   --report <file>   also writes the table, as Markdown, to <file>
//   --write           writes BENCH.md from this tree's rows
//
// Each tree is built and measured on its own install: most of what a parser
// costs is its dependency, so a change of the lockfile is a change measured.
//
// It exits with 1 when a project of this tree failed, and with 2 when only the
// comparison failed: a row of the base is missing from this tree, or a project
// of the base failed. The `bench-accepted:<package>` label lets the second
// pass in CI.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arch, constants, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

/**
 * @typedef {'size' | 'time'} Kind
 * @typedef {{ id: string; kind: Kind; unit: string; value: number }} Row
 * @typedef {'master' | 'head'} Subject
 * @typedef {'build' | 'sizes' | 'times'} Project
 * @typedef {{ kind: Kind; unit: string; values: number[] }} Measured
 */

const MEASURE = join(dirname(fileURLToPath(import.meta.url)), 'measure.mjs');
/** @type {Kind[]} */
const KINDS = ['size', 'time'];

// A time counts as changed only beyond the spread of both sides and by more
// than this share of master's median.
const THRESHOLD = 0.05;

const { values: args } = parseArgs({
  options: {
    compare: { type: 'string' },
    samples: { type: 'string', default: '5' },
    report: { type: 'string' },
    write: { type: 'boolean', default: false },
  },
});

const ROOT = process.cwd();

if (!existsSync(join(ROOT, 'bench/subject.mjs'))) throw new Error(`${ROOT} has no bench/subject.mjs: run the benchmark from a package directory.`);

const samples = Number(args.samples);

if (!Number.isInteger(samples) || samples < 1) throw new Error(`--samples takes a positive integer, not ${args.samples}.`);

/** @type {(dir: string) => { name: string; version: string; dependencies?: Record<string, string> }} */
const manifest = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const pkg = manifest(ROOT);
const name = pkg.name.split('/').pop() ?? pkg.name;
const label = `bench-accepted:${name}`;
/** @type {Partial<Record<Subject, string>>} */
const trees = { head: ROOT };

// A package the base does not have yet is measured alone.
if (args.compare && existsSync(join(resolve(args.compare), 'package.json'))) {
  const master = resolve(args.compare);

  if (!existsSync(join(master, 'node_modules'))) throw new Error(`${master} has no install: run \`npm ci\` there first.`);

  trees.master = master;
}

const subjects = /** @type {Subject[]} */ (Object.keys(trees));
/** @type {Record<Subject, Set<Project>>} */
const failed = { master: new Set(), head: new Set() };
// Under the package's install, where a run stopped short leaves nothing in
// the tree, one directory per run.
mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true });

const OUT = mkdtempSync(join(ROOT, 'node_modules/.cache/bench-'));

process.on('exit', () => rmSync(OUT, { recursive: true, force: true }));

// A signal stops the run between two processes, so the directory goes too. A
// child the terminal stopped as well ends first, and one it did not finishes.
for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM'])) process.on(signal, () => process.exit(128 + constants.signals[signal]));

/**
 * Hands the event loop a turn, which every signal received while a child ran
 * waits for.
 *
 * @type {() => Promise<void>}
 */
const settle = () => new Promise((done) => { setImmediate(done); });

// The build each tree ships, from its own toolchain. Under `npm run`, npm is
// the one that started this; otherwise the one on the path.
for (const subject of subjects) {
  const npm = process.env.npm_execpath;
  const { status } = npm
    ? spawnSync(process.execPath, [npm, 'run', 'build'], { cwd: trees[subject], stdio: ['ignore', 'inherit', 'inherit'] })
    : spawnSync('npm', ['run', 'build'], { cwd: trees[subject], stdio: ['ignore', 'inherit', 'inherit'], shell: platform() === 'win32' });

  if (status !== 0) failed[subject].add('build');
  await settle();
}

/**
 * Runs one project against one tree in a process of its own and reads back
 * its rows.
 *
 * @type {(subject: Subject, project: Exclude<Project, 'build'>, sample: number) => Promise<Row[]>}
 */
const run = async (subject, project, sample) => {
  if (failed[subject].has('build')) return [];

  const out = join(OUT, `${subject}-${project}-${sample}.json`);
  const { status } = spawnSync(process.execPath, [MEASURE, '--project', project, '--tree', /** @type {string} */ (trees[subject]), '--out', out], {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    // Dates render alike on every machine, and a dependency runs as an app
    // ships it.
    env: { ...process.env, NODE_ENV: 'production', TZ: 'UTC' },
  });

  if (status !== 0) failed[subject].add(project);
  await settle();

  return existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
};

/** @type {Record<Subject, Map<string, Measured>>} */
const measured = { master: new Map(), head: new Map() };

/** @type {(subject: Subject, rows: Row[]) => void} */
const add = (subject, rows) => rows.forEach(({ id, kind, unit, value }) => {
  const entry = measured[subject].get(id) ?? { kind, unit, values: [] };

  entry.values.push(value);
  measured[subject].set(id, entry);
});

// Sizes are the same on every run, so one run of each side does.
for (const subject of subjects) add(subject, await run(subject, 'sizes', 0));

// Times alternate between the sides, each sample in a fresh process, so a
// drift of the machine lands on both.
for (let sample = 0; sample < samples; sample++) {
  const order = sample % 2 ? [...subjects].reverse() : subjects;

  for (const subject of order) add(subject, await run(subject, 'times', sample));
}

/** @type {(values: number[]) => number} */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** @type {(value: number, unit: string) => string} */
const format = (value, unit) => {
  if (unit === 'ms' || unit === 'µs') return `${value.toLocaleString('en-US', { maximumSignificantDigits: 3 })} ${unit}`;

  return `${Math.round(value).toLocaleString('en-US')} ${unit}`;
};

/** @type {(entry: Measured) => string} */
const spread = ({ values, unit }) => (values.length > 1 ? `${format(Math.min(...values), unit)} to ${format(Math.max(...values), unit)}` : '');

/** @typedef {{ id: string; kind: Kind; master?: Measured; head?: Measured; flag: string; delta: string }} Line */

/** @type {(id: string) => Line} */
const compare = (id) => {
  const master = measured.master.get(id);
  const head = measured.head.get(id);
  const kind = /** @type {Measured} */ (head ?? master).kind;

  if (!head) return { id, kind, master, flag: 'missing', delta: '' };

  if (!master) return { id, kind, head, flag: args.compare ? 'new' : '', delta: '' };

  const [from, to] = [median(master.values), median(head.values)];
  const change = from === 0 ? (to === 0 ? 0 : Infinity) : (to - from) / Math.abs(from);
  const delta = from === to ? '0' : `${to > from ? '+' : ''}${format(to - from, head.unit)}${Number.isFinite(change) ? ` (${to > from ? '+' : ''}${(100 * change).toFixed(1)}%)` : ''}`;

  if (kind === 'time') {
    const slower = Math.min(...head.values) > Math.max(...master.values) && change >= THRESHOLD;
    const faster = Math.max(...head.values) < Math.min(...master.values) && change <= -THRESHOLD;

    return { id, kind, master, head, delta, flag: slower ? 'slower, review' : faster ? 'faster' : '' };
  }

  if (to > from) return { id, kind, master, head, delta, flag: 'grew, review' };

  return { id, kind, master, head, delta, flag: to < from ? 'shrank' : '' };
};

const ids = [...new Set([...measured.head.keys(), ...measured.master.keys()])];
const lines = KINDS.flatMap((kind) => ids.map(compare).filter((line) => line.kind === kind));

const missing = lines.filter(({ flag }) => flag === 'missing');
const review = lines.filter(({ flag }) => flag.endsWith('review'));

/** @type {(text: string) => string} */
const cell = (text) => text.replaceAll('|', '\\|');
/** @type {(entry?: Measured) => string} */
const value = (entry) => (entry ? format(median(entry.values), entry.unit) : 'n/a');

const table = trees.master
  ? [
    '| Row | Kind | Master | Head | Delta | Spread (master; head) | Flag |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |',
    ...lines.map((line) => `| ${cell(line.id)} | ${line.kind} | ${value(line.master)} | ${value(line.head)} | ${line.delta} | ${line.kind === 'time' ? [line.master, line.head].map((entry) => (entry ? spread(entry) : 'n/a')).join('; ') : ''} | ${line.flag} |`),
  ]
  : [
    '| Row | Kind | Value | Spread |',
    '| --- | --- | ---: | --- |',
    ...lines.map((line) => `| ${cell(line.id)} | ${line.kind} | ${value(line.head)} | ${line.head ? spread(line.head) : ''} |`),
  ];

const compared = failed.master.size + missing.length;

const verdict = [
  ...[...failed.head].map((project) => `- **Failed:** the ${project} project of this branch. The job fails.`),
  ...[...failed.master].map((project) => `- **Failed on the base:** the ${project} project; a row it did not measure reads n/a.`),
  ...missing.map(({ id }) => `- **Missing on head:** ${id}.`),
  compared && !failed.head.size ? `- The job fails on the comparison unless the PR carries the \`${label}\` label.` : '',
  review.length ? `- ${review.length} row${review.length === 1 ? '' : 's'} to review: a size that grew or a time beyond its spread by ${100 * THRESHOLD}% or more. Neither fails the job.` : '',
].filter(Boolean);

/**
 * The runtime dependencies a tree measured, at the versions its install holds.
 *
 * @type {(dir: string) => string}
 */
const dependencies = (dir) => Object.keys(manifest(dir).dependencies ?? {}).map((dependency) => {
  const installed = join(dir, 'node_modules', dependency, 'package.json');

  return `${dependency} ${existsSync(installed) ? manifest(dirname(installed)).version : 'not installed'}`;
}).join(', ') || 'none';

const environment = [
  `Node ${process.version}, ${platform()} ${arch()}; times are medians of ${samples} process${samples === 1 ? '' : 'es'}${trees.master ? ' per side' : ''}, each the median of its rounds. Sizes include the parser's dependencies.`,
  ...subjects.map((subject) => `${trees.master ? `${subject[0].toUpperCase()}${subject.slice(1)} runs on ` : 'Dependencies: '}${dependencies(/** @type {string} */ (trees[subject]))}.`),
].join('\n');

const report = [
  `<!-- bench:${name} -->`,
  `## Benchmark: \`${pkg.name}\``,
  '',
  trees.master ? 'This branch against its base.' : args.compare ? 'This branch; the base has no such package.' : 'This tree.',
  environment,
  '',
  ...(verdict.length ? [...verdict, ''] : trees.master ? [`No size grew and no time slowed beyond its spread by ${100 * THRESHOLD}% or more.`, ''] : []),
  ...table,
  '',
].join('\n');

console.log(`\n${report}`);

if (args.report) writeFileSync(resolve(args.report), report);

if (args.write) {
  /** @type {(kind: Kind, title: string, blurb: string) => string[]} */
  const section = (kind, title, blurb) => {
    const rows = lines.filter((line) => line.kind === kind && line.head);

    return [
      `## ${title}`,
      '',
      blurb,
      '',
      ...(kind === 'time' ? ['| Row | Median | Spread |', '| --- | ---: | --- |'] : ['| Row | Value |', '| --- | ---: |']),
      ...rows.map((line) => `| ${cell(line.id)} | ${value(line.head)} |${kind === 'time' ? ` ${spread(/** @type {Measured} */ (line.head))} |` : ''}`),
      '',
    ];
  };

  writeFileSync(join(ROOT, 'BENCH.md'), [
    '# Benchmark',
    '',
    `What \`npm run bench\` measured on \`${pkg.name}\` ${pkg.version}, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.`,
    '',
    environment,
    '',
    ...section('size', 'Sizes', 'Bytes of a browser bundle, the dependencies included: the same on every machine.'),
    ...section('time', 'Times', 'Microseconds and milliseconds, of one machine at one time: compare them only with figures measured beside them.'),
  ].join('\n'));
}

if (failed.head.size) process.exitCode = 1;
else if (compared) process.exitCode = 2;

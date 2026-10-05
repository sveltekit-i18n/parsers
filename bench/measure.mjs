// Measures one project of the benchmark against one built tree, in a process
// of its own, and writes its rows as JSON. `run.mjs` starts it; nothing else
// should. It resolves nothing from the repository root, which has no install:
// the bundler comes from the install of the package it is run from, and the
// parser from the tree it measures.
//
//   --project sizes|times|heap   what to measure; heap under `--expose-gc
//                                --max-opt=0`, as run.mjs starts it
//   --tree <dir>                 the package root measured: its `dist/` and
//                                `src/`
//   --out <file>                 where the rows go
import { realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

/**
 * @typedef {'size' | 'time' | 'heap'} Kind
 * @typedef {{ id: string; kind: Kind; unit: string; value: number; most?: number }} Row
 *
 * A message kind, written in the parser's own format.
 * @typedef {object} Label
 * @property {(n: number) => string} message A distinct message for each `n`.
 * @property {unknown[]} params The rest parameters `t()` hands `parse`.
 * @property {(n: number) => unknown} output What `parse` returns for `message(n)`.
 * @property {string[]} names The parameters `extractParams` reports.
 *
 * What a package measures, in `bench/subject.mjs`.
 * @typedef {object} Subject
 * @property {Record<string, unknown>} options The options `parser()` takes,
 *   `onReport` aside: the benchmark counts the reports itself.
 * @property {Record<string, Label>} labels The message kinds, keyed by a label
 *   the rows name.
 * @property {number} [cached] How many compiled messages the parser keeps by
 *   default, if it keeps any; the heap project needs 1,000 or more.
 */

const { values: args } = parseArgs({
  options: {
    project: { type: 'string' },
    tree: { type: 'string' },
    out: { type: 'string' },
  },
});

if (!args.tree || !args.out || !['sizes', 'times', 'heap'].includes(args.project ?? '')) throw new Error('Usage: measure.mjs --project sizes|times|heap --tree <dir> --out <file>');

// The bundler reports the paths it reads with their links resolved.
const tree = realpathSync.native(resolve(args.tree));
const LOCALE = 'en';
const KEY = 'bench.key';

/** @type {Subject} */
const subject = (await import(pathToFileURL(resolve('bench/subject.mjs')).href)).default;

/** @type {Row[]} */
const rows = [];

// The bounds the rows went over, which fail the project once they are
// written, so the report shows the value that failed.
/** @type {string[]} */
const failures = [];

/** @type {(id: string, kind: Kind, unit: string, value: number, most?: number) => void} */
const record = (id, kind, unit, value, most) => {
  rows.push({ id, kind, unit, value, most });
};

/** @type {(value: number) => string} */
const n = (value) => value.toLocaleString('en-US');

/** @type {(values: number[]) => number} */
const median = (values) => [...values].sort((a, b) => a - b)[values.length >> 1];

/**
 * The median duration of `fn` in milliseconds per call, over `samples` rounds
 * of `inner` calls each, after three rounds that warm up. `fn` receives the
 * index of the call, counted across every round, warm-up included.
 *
 * @type {(fn: (index: number) => void, options?: { inner?: number; samples?: number }) => number}
 */
const time = (fn, { inner = 1, samples = 15 } = {}) => {
  let index = 0;

  for (let i = 0; i < 3 * inner; i++) fn(index++);

  /** @type {number[]} */
  const durations = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    for (let j = 0; j < inner; j++) fn(index++);
    durations.push((performance.now() - start) / inner);
  }

  return median(durations);
};

/**
 * Strings as a catalogue delivers them: built from JSON, so flat, and none of
 * the work of building them lands in the timing.
 *
 * @type {(count: number, message: (n: number) => string) => string[]}
 */
const messages = (count, message) => JSON.parse(JSON.stringify(Array.from({ length: count }, (_, i) => message(i))));

/** @type {(message: string, expected: unknown, actual: unknown) => void} */
const check = (message, expected, actual) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
};

if (args.project === 'sizes') {
  // The bundler of the package the benchmark runs from, so both trees are
  // bundled alike; each resolves its own dependencies.
  const esbuild = createRequire(resolve('package.json'))('esbuild');

  /**
   * A browser bundle of `contents`, an entry module in the tree's root,
   * minified as an app ships it, the parser's dependencies included.
   *
   * @type {(contents: string, plugins?: object[], minify?: object) => Promise<string>}
   */
  const bundle = async (contents, plugins = [], minify = { minify: true }) => {
    const { outputFiles: [output] } = await esbuild.build({
      stdin: { contents, resolveDir: tree, sourcefile: 'entry.js' },
      bundle: true,
      ...minify,
      write: false,
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      plugins,
    });

    return output.text;
  };

  for (const [name, contents] of [
    ['parser()', "import parser from './dist/index.js'; export default parser;"],
    ['parser() and extractParamsFactory', "import parser, { extractParamsFactory } from './dist/index.js'; export { parser, extractParamsFactory };"],
  ]) {
    const text = await bundle(contents);

    record(`browser bundle of ${name}, minified`, 'size', 'B', Buffer.byteLength(text));
    record(`browser bundle of ${name}, minified and gzipped`, 'size', 'B', gzipSync(text).length);
  }

  // A bundle that imports only the parser must ship nothing of the extractor:
  // built from the source, it comes out byte for byte as it does with
  // `src/extract.ts` emptied, whatever the extractor reaches in a dependency.
  // The build flattens the source into one module, which `sideEffects: false`
  // keeps or drops whole, so the source modules are bundled as side effects
  // here: a top-level statement of `src/extract.ts` stays in. Identifiers are
  // not renamed, or the emptied module would shift the names of the rest.
  const src = join(tree, 'src', sep);
  const parserOnly = "import parser from './src/index.ts'; export default parser;";
  const shaken = (/** @type {object[]} */ plugins) => bundle(parserOnly, [{
    name: 'source-side-effects',
    setup: (build) => {
      build.onResolve({ filter: /^\.\.?\// }, async ({ path, kind, importer, resolveDir, pluginData }) => {
        if (pluginData === 'source-side-effects' || !importer.startsWith(src)) return undefined;

        const resolved = await build.resolve(path, { kind, importer, resolveDir, pluginData: 'source-side-effects' });

        return resolved.errors.length || !resolved.path.startsWith(src) ? undefined : { path: resolved.path, sideEffects: true };
      });
    },
  }, ...plugins], { minifySyntax: true, minifyWhitespace: true });

  if (await shaken([]) !== await shaken([{
    name: 'no-extractor',
    setup: (build) => {
      build.onLoad({ filter: /[\\/]src[\\/]extract\.ts$/ }, () => ({ contents: 'export const extractParamsFactory = undefined;', loader: 'ts' }));
    },
  }])) throw new Error('A bundle that imports only parser() ships part of the extractor: extractParamsFactory is not shaken out.');
} else {
  const module = await import(pathToFileURL(join(tree, 'dist/index.js')).href);
  /** @type {(options: Record<string, unknown>) => { parse: (value: unknown, params: unknown[], locale: string, key: string) => unknown }} */
  const factory = module.default;
  /** @type {(options?: Record<string, unknown>) => (message: string) => readonly { name: string }[]} */
  const extractParamsFactory = module.extractParamsFactory;
  let reports = 0;
  const options = { ...subject.options, onReport: () => { reports += 1; } };
  const build = () => factory(options);
  const extract = extractParamsFactory(subject.options);

  // A parser fails soft: a message it cannot render comes back raw and is
  // reported, faster than one it renders. So every label is checked before it
  // is measured, first parse and repeated one alike, and a broken one fails
  // the project rather than read as fast; whatever the measured rows report
  // fails it after them.
  for (const [label, { message, params, output, names }] of Object.entries(subject.labels)) {
    const parser = build();

    check(`parse, ${label}`, output(1), parser.parse(message(1), params, LOCALE, KEY));
    check(`parse again, ${label}`, output(1), parser.parse(message(1), params, LOCALE, KEY));
    check(`extractParams, ${label}`, [...names].sort(), extract(message(1)).map(({ name }) => name).sort());
  }

  check('reports of the checked parses', 0, reports);

  if (args.project === 'heap') {
    if (typeof globalThis.gc !== 'function') throw new Error('The heap project runs under --expose-gc: start it through run.mjs.');

    // What a parser holds is read as the difference between two points of one
    // curve, so whatever is constant from the first point on cancels: the
    // module, the instance, the first read, and code compiled for a path
    // already run thousands of times, since `--max-opt=0` leaves every tier of
    // V8's above its interpreter out: Sparkplug, Maglev and TurboFan. Nothing
    // writes to a stream between two points: the first write to one allocates
    // its state, so each is written to here.
    process.stdout.write('');
    process.stderr.write('');

    const gc = /** @type {() => void} */ (globalThis.gc);
    // Typed, so a read allocates no number of its own.
    const heap = new Float64Array(4);
    const read = (/** @type {number} */ point) => {
      gc();
      gc();
      heap[point] = process.memoryUsage().heapUsed;
    };
    /** @type {(from: number, to: number, count: number) => number} */
    const held = (from, to, count) => (heap[to] - heap[from]) / count;
    // A pointer kept per message, per parse or per parser reads 8 B or more; a
    // parser that keeps nothing more reads under 1 B.
    /** @type {(id: string, unit: string, value: number, most: number) => void} */
    const bounded = (id, unit, value, most) => {
      record(id, 'heap', unit, value, most);
      if (!(value < most)) failures.push(`${id}: ${value} ${unit}, where it must stay under ${most}.`);
    };

    const labels = Object.values(subject.labels);
    const limit = subject.cached ?? 10_000;
    // The rows past the limit and of the messages parsed before divide by a
    // count of messages or parses that grows with it: from 1,000 on, a one-off
    // allocation of a few kilobytes stays under their bounds.
    if (limit < 1_000) throw new Error(`The heap project measures a parser that keeps 1,000 messages or more; this one keeps ${n(limit)}.`);
    // Every label in turn, each message as wide as the next: one that gained a
    // digit would hold more than the one it evicts, a growth of no parser's.
    const first = 10 ** String(6 * limit).length;
    const labelAt = (/** @type {number} */ index) => labels[index % labels.length];
    const messageAt = (/** @type {number} */ index) => labelAt(index).message(first + index);
    /** @type {(parser: ReturnType<typeof build>, from: number, to: number) => void} */
    const parseStream = (parser, from, to) => {
      for (let start = from; start < to; start += 1_000) {
        messages(Math.min(1_000, to - start), (i) => messageAt(start + i)).forEach((message, i) => parser.parse(message, labelAt(start + i).params, LOCALE, KEY));
      }
    };

    // The first read of the process allocates, so it counts for nothing.
    read(0);

    // A parser built, used and dropped leaves nothing behind.
    const parsers = (/** @type {number} */ count) => {
      for (let i = 0; i < count; i++) parseStream(build(), 0, 10);
    };

    parsers(200);
    read(0);
    parsers(400);
    read(1);
    bounded('JS heap held per parser built and dropped, from 200 to 600 parsers', 'B/parser', held(0, 1, 400), 4);

    // One parser through distinct messages: under its limit, what it keeps of
    // each; past it, nothing more, since each message it keeps evicts one.
    // Each point ends a whole turn of the labels, so the messages kept at one
    // are of the same labels as at the next, and at least one turn past the
    // one before it.
    const parser = build();
    const turns = [limit / 4, limit / 2, 2 * limit, 6 * limit].reduce((all, point) => [...all, Math.max(Math.round(point / labels.length), (all.at(-1) ?? -1) + 1)], /** @type {number[]} */ ([]));
    const points = turns.map((turn) => labels.length * turn);

    points.forEach((point, i) => {
      parseStream(parser, i ? points[i - 1] : 0, point);
      read(i);
    });
    record(`JS heap held per message parsed, from ${n(points[0])} to ${n(points[1])} messages`, 'heap', 'B/message', held(0, 1, points[1] - points[0]));
    bounded(`JS heap held per message parsed, from ${n(points[2])} to ${n(points[3])} messages`, 'B/message', held(2, 3, points[3] - points[2]), 4);

    // The last messages parsed, parsed again: a parser that keeps any still
    // keeps these.
    const recent = points[3] - Math.round(limit / 2);
    const hot = messages(points[3] - recent, (i) => messageAt(recent + i));
    const again = (/** @type {number} */ count) => {
      for (let i = 0; i < count; i++) parser.parse(hot[i % hot.length], labelAt(recent + (i % hot.length)).params, LOCALE, KEY);
    };

    again(limit);
    read(0);
    again(4 * limit);
    read(1);
    bounded(`JS heap held per parse of a message parsed before, over ${n(4 * limit)} parses`, 'B/parse', held(0, 1, 4 * limit), 1);

    // The parser stays reachable through the last read, and still renders.
    check('parse after measuring', labelAt(recent).output(first + recent), parser.parse(hot[0], labelAt(recent).params, LOCALE, KEY));
    check('reports while measuring', 0, reports);
  } else {
    const micro = (/** @type {(index: number) => void} */ fn, inner = 2_000) => 1_000 * time(fn, { inner });

    record('parser(options)', 'time', 'µs', micro(() => build(), 200));

    // Each row runs in a function of its own, so nothing it built stays
    // reachable into the next one.
    const rowsOf = (/** @type {string} */ label, /** @type {Label} */ { message, params }) => {
      const inner = 500;
      const fresh = messages(18 * inner, message);
      const same = message(0);
      const parser = build();
      const again = build();

      // A parser that keeps compiled messages is filled first, so each message
      // timed also evicts one, as in an app past its limit.
      for (let i = 0; i < (subject.cached ?? 0); i++) parser.parse(message(-1 - i), params, LOCALE, KEY);
      record(`parse, ${label}, a message parsed for the first time`, 'time', 'µs', micro((i) => parser.parse(fresh[i], params, LOCALE, KEY), inner));
      record(`parse, ${label}, the same message again`, 'time', 'µs', micro(() => again.parse(same, params, LOCALE, KEY)));
      record(`extractParams, ${label}`, 'time', 'µs', micro(() => extract(same)));
    };

    for (const [label, entry] of Object.entries(subject.labels)) rowsOf(label, entry);

    const catalogueRow = () => {
      const labels = Object.values(subject.labels);
      const catalogue = messages(10_000, (i) => labels[i % labels.length].message(i));

      record(`extractParams over a catalogue of ${n(catalogue.length)} messages`, 'time', 'ms', time(() => catalogue.forEach((message) => extract(message)), { samples: 5 }));
    };

    catalogueRow();

    check('reports while measuring', 0, reports);
  }
}

writeFileSync(args.out, JSON.stringify(rows));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}

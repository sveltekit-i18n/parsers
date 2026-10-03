// Measures one project of the benchmark against one built tree, in a process
// of its own, and writes its rows as JSON. `run.mjs` starts it; nothing else
// should. It resolves nothing from the repository root, which has no install:
// the bundler comes from the install of the package it is run from, and the
// parser from the tree it measures.
//
//   --project sizes|times   what to measure
//   --tree <dir>            the package root measured: its `dist/` and `src/`
//   --out <file>            where the rows go
import { realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

/**
 * @typedef {'size' | 'time'} Kind
 * @typedef {{ id: string; kind: Kind; unit: string; value: number }} Row
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
 *   default, if it keeps any.
 */

const { values: args } = parseArgs({
  options: {
    project: { type: 'string' },
    tree: { type: 'string' },
    out: { type: 'string' },
  },
});

if (!args.tree || !args.out || !['sizes', 'times'].includes(args.project ?? '')) throw new Error('Usage: measure.mjs --project sizes|times --tree <dir> --out <file>');

// The bundler reports the paths it reads with their links resolved.
const tree = realpathSync.native(resolve(args.tree));
const LOCALE = 'en';
const KEY = 'bench.key';

/** @type {Subject} */
const subject = (await import(pathToFileURL(resolve('bench/subject.mjs')).href)).default;

/** @type {Row[]} */
const rows = [];

/** @type {(id: string, kind: Kind, unit: string, value: number) => void} */
const record = (id, kind, unit, value) => {
  rows.push({ id, kind, unit, value });
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

writeFileSync(args.out, JSON.stringify(rows));

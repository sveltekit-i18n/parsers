# AGENTS.md

Behavioral guidelines for LLM coding assistants working on the
**sveltekit-i18n parsers** monorepo. Applies to anything that drives commits,
PRs, or file edits on this repo.

**Precedence:** These repo rules override individual LLM memory or personal
preference. If your own memory conflicts with this file, follow this file.

This repo follows the same working rules as
[`base`'s AGENTS.md](https://github.com/sveltekit-i18n/base/blob/master/AGENTS.md)
(sections 1-14: think before coding, simplicity first, surgical changes,
verify and review cycle with release planning, commit on approval, fixup
hygiene, branch & push discipline, PRs, docs track code, coding conventions,
security posture, English-only artifacts, test rules, terse output, no
emojis). What follows is only what differs here.

Those rules are not in this file, and nothing loads them for you: before any
change, read base's AGENTS.md in full — `../base/AGENTS.md` when `base` is
checked out beside this repository on an up-to-date `master`, otherwise
[the raw file](https://raw.githubusercontent.com/sveltekit-i18n/base/master/AGENTS.md)
— and follow it as fully as the rules below.

---

## The repository

Official message parsers for the
[sveltekit-i18n](https://github.com/sveltekit-i18n/lib) ecosystem
(`base` / `lib` / `parsers` / `extensions`).

- **Monorepo without workspaces** — no root `package.json`; each `parser-*/`
  directory is a fully standalone npm package with its own `package.json`,
  lockfile, configs, tests, README, LICENSE, and CHANGELOG.
- The root holds only `README.md`, this file, `CLAUDE.md`, `.gitignore`,
  `.github/workflows/`, `contract/` and `bench/`.
- **`contract/` is shared source.** It holds base's parser
  contract as a set of checks each package runs from its own
  `tests/specs/contract.spec.ts`. It resolves nothing — no types, no test
  runner, no package of its own — because each package carries its own
  `node_modules` and the root has none; a package's `tsc` pulls it in through
  that spec. ESLint does not reach it — a flat config's base path is its own
  directory, and a root config would mean a root package — so match the
  formatting conventions by hand there. Every test workflow watches
  `contract/**`.
- **`bench/` is the shared benchmark** (base's §4, step 3), run from a package
  directory as `npm run bench`, or `npm run bench -- --compare <dir>` against
  the same package checked out and installed at `<dir>`. It is plain
  JavaScript that imports nothing but Node's own modules, so Node runs it as
  it is on every version the packages support, and nothing type-checks or
  lints it — match the conventions by hand, as in `contract/`. `run.mjs`
  builds each tree and starts `measure.mjs` once per project and sample;
  `measure.mjs` takes the bundler from the package it runs from and the
  parser from the tree it measures. Each tree runs on its own install: most
  of what a parser costs is its dependency, so a change of the lockfile is a
  change measured, and the report names the versions on each side. A
  package's `bench/subject.mjs` holds one message per kind in its own format
  and what each must render and report as parameters; a label that renders
  anything else fails the project before it is timed, since a parser that
  fails soft is fastest on a message it cannot read. The sizes are browser
  bundles of `dist/`, the dependencies included, and a bundle of `parser()`
  alone must come out byte for byte as it does with `src/extract.ts` emptied,
  the source modules kept as side effects since the build flattens them into
  one, which keeps `extractParamsFactory` out of an app that never imports it.
  `bench-parser-<package>.yml` runs it on every pull request that changes the
  package's source, build config, manifest, lockfile or `bench/`, or the
  shared `bench/`, through the reusable `bench.yml`, and posts the table
  as a comment per package. A project of the branch that fails fails the
  job; so does the comparison — a row gone missing, a project of the base
  that failed — unless the pull request carries that package's
  `bench-accepted:<package>` label (`bench-label.yml` re-runs the job when
  the label changes). A size that grew and a time beyond its spread are
  flagged for review. `publish.yml` writes the package's `BENCH.md` into the
  release commit.

## Current state: v3 released from `master`

- **`master` is the v3 line** — v3 work lands here. `parser-curly` is a thin
  adapter over `@curly-message/parser` (the Curly Message Format's reference
  implementation; the format lives in https://curlymessage.dev)
  and runs the format's conformance set in its tests; `parser-icu` wraps
  `intl-messageformat`; `parser-mf2` wraps `messageformat` (the Unicode
  MessageFormat 2 reference implementation); `parser-i18next` wraps
  `i18next`. All build with tsup and test with vitest, and all run that suite
  on Node, Bun and Deno — no package reaches for a runtime API, and the extra
  legs exist to keep that true.
- **`1.x` is a frozen snapshot** of the published v1 line. It receives nothing
  unless a critical v1 fix is explicitly requested. `parser-curly` carries none
  of that history: it starts at 3.0.0, and `@sveltekit-i18n/parser-default` on
  `1.x` is a different package.
- **The family released aligned at 3.0.0** — the parsers alongside `base`,
  `extension-stores` and `sveltekit-i18n` — as
  [lib#214](https://github.com/sveltekit-i18n/lib/issues/214) set out. Each
  package moves on its own from there, so read a version off npm rather than
  off this file. A parser's peer range on the core is `^3.0.0` widened by the
  core's `3.1.0-next` line (`^3.0.0 || ^3.1.0-next.0`), so that line installs
  underneath one; a prerelease of another version does not, and each later
  prerelease line needs a widening of its own. The widening stays once its
  version is stable: narrowing it would fail an app still on one of its
  prereleases.
- **A `parser-curly` release means a `sveltekit-i18n` release**, which pins
  it exactly: plan them as one release (base's §4, *Releases*), this package
  first. Each package's `README.md` is its npm page, so it describes the
  version being published, and each of its links resolves.
- Issues for this repo live in the `lib` tracker.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.

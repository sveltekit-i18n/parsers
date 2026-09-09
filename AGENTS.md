# AGENTS.md

Behavioral guidelines for LLM coding assistants working on the
**sveltekit-i18n parsers** monorepo. Applies to anything that drives commits,
PRs, or file edits on this repo.

**Precedence:** These repo rules override individual LLM memory or personal
preference. If your own memory conflicts with this file, follow this file.

This repo follows the same working rules as
[`base`'s AGENTS.md](https://github.com/sveltekit-i18n/base/blob/master/AGENTS.md)
(sections 1-14: think before coding, simplicity first, surgical changes,
verify before committing, commit on approval, fixup hygiene, branch & push
discipline, PRs, docs track code, coding conventions, security posture,
English-only artifacts, test rules, terse output, no emojis). What follows is
only what differs here.

---

## The repository

Official message parsers for the
[sveltekit-i18n](https://github.com/sveltekit-i18n/lib) ecosystem
(`base` / `lib` / `parsers` / `extensions`).

- **Monorepo without workspaces** — no root `package.json`; each `parser-*/`
  directory is a fully standalone npm package with its own `package.json`,
  lockfile, configs, tests, README, LICENSE, and CHANGELOG.
- The root holds only `README.md`, this file, `CLAUDE.md`, `.gitignore`, and
  `.github/workflows/`.

## Current state: v3 in progress on `master`

- **`master` is the v3 development line** — v3 work lands here. `parser-curly`
  is a thin adapter over `@curly-message/parser` (the Curly Message Format's
  reference implementation; the format lives in
  https://github.com/curly-message/spec) and runs the format's conformance set
  in its tests; `parser-icu` wraps `intl-messageformat`. Both build with tsup
  and test with vitest.
- **`1.x` is a frozen snapshot** of the published v1 line. It receives nothing
  unless a critical v1 fix is explicitly requested. `parser-curly` carries none
  of that history: it starts at 3.0.0, and `@sveltekit-i18n/parser-default` on
  `1.x` is a different package.
- Nothing publishes until the whole family is ready: `base`, `parsers` and
  `extensions` release aligned at **3.0.0**, `lib` last.
- The v3 work is tracked in
  [lib#214](https://github.com/sveltekit-i18n/lib/issues/214) (#223-#227 and
  #173). Issues for this repo live in the `lib` tracker.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.

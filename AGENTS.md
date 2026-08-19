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

## Current state: v1, frozen for the v3 train

- `master` still carries the **v1 packages** (Jest, tsup — see each package's
  configs). The v1 line is frozen: critical fixes only, applied on the `1.x`
  maintenance branch.
- The v3 work is tracked in
  [lib#214](https://github.com/sveltekit-i18n/lib/issues/214) (#223-#227 and
  #173). Issues for this repo live in the `lib` tracker.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.

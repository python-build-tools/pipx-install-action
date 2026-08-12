<!-- For repo-specific context (what this repo is, stack, commands, CI/CD), see .agents/INSTRUCTIONS.md. This file holds only hard rules. -->

# Agent instructions

For full repo-specific context (stack, golden commands, CI/CD, pitfalls), see
[.agents/INSTRUCTIONS.md](.agents/INSTRUCTIONS.md).

## Constraints

- Never commit a change to `src/`, `package.json`, or `package-lock.json`
  without running `npm run all` first (or at minimum `npm run package`).
  `dist/index.js` is the file GitHub Actions actually executes, and
  `check-dist.yml` CI fails if the committed `dist/` doesn't match a fresh
  build.
- Do not bump `@actions/core`, `@actions/cache`, or `@actions/exec` past their
  last CommonJS-compatible major (`^2.x`, `^5.x`, `^2.x` respectively) — later
  majors are ESM-only and this repo's `src/` uses `require()`. See
  INSTRUCTIONS.md before accepting any Dependabot PR proposing these bumps.
- Don't add or `require()` a dependency without using it. Check the GitHub
  Advisory Database / `npm audit` before adding or upgrading dependencies.
- No secrets, tokens, or credentials in code, tests, or workflow files.

Trust these instructions first; search the repo only when something is missing
or incorrect.

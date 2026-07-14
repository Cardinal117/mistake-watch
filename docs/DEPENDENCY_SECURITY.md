# Dependency Security Baseline

Snapshot date: 2026-07-14

`npm audit` reports three moderate advisories, with no high or critical
findings:

- Next.js includes a vulnerable PostCSS version used by its bundled toolchain.
  npm suggests downgrading Next.js to `9.3.3`; that is an unsafe and
  incompatible remediation and must not be applied.
- `js-yaml` has a moderate denial-of-service advisory in the development
  dependency tree.

The project remains on Next.js 16.2.6. Reassess when a compatible upstream
release updates the bundled PostCSS dependency. Do not use
`npm audit fix --force` for this repository.

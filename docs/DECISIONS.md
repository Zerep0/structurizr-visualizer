# Decisions

## D-001 — Official parser 6.2.3 is the compatibility authority

Status: accepted on 2026-10-08.

The language reference and the tagged Java implementation are used together. Documentation describes intent; executable differential tests will decide ambiguous behavior and record discrepancies. The project does not copy the Java parser implementation.

## D-002 — Newlines are parser-visible

Status: accepted.

Whitespace excluding line endings is hidden; end-of-line tokens remain visible to grammar rules. This prevents a declaration's optional positional arguments from consuming the next declaration. Inline-block and comment edge cases require explicit tests rather than globally hiding all whitespace.

## D-003 — Human names are not semantic identifiers

Status: accepted.

Element `displayName` values can be anonymous and are not reference keys. Optional assignment identifiers are exposed through a custom Langium name provider. This enables semantic completion, definition, references, and future rename behavior.

## D-004 — Preserve ordered positional arguments initially

Status: accepted with follow-up.

The same keyword families have different positional signatures. The AST currently retains trailing values in order rather than assigning misleading universal fields such as `technology`. Typed semantic normalization will interpret them by construct, and validators will enforce arity.

## D-005 — Do not execute advanced directives in static language services

Status: accepted.

`!script`, `!plugin`, and `!components` require a separate trusted compatibility adapter. Merely recognizing syntax will never trigger JVM code, downloads, or network access.

## D-006 — Use pnpm's dependency-build allowlist

Status: accepted.

pnpm 12 blocks dependency lifecycle scripts by default. Only `esbuild`, a direct build dependency of the extension, is allowlisted in `pnpm-workspace.yaml`.

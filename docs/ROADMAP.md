# Roadmap

## P0 — Language foundation

- Complete per-construct positional grammar and arity tests.
- Add archetypes, bulk modification directives, scripts/plugins as inert AST nodes, and every style property.
- Extend the common symbol model to deployment instances, deployment groups, relationships, views, and archetypes.
- Add official relationship legality and type-aware reference filters.
- Add keyword/reference/path completion tests and recovery fixtures.

Exit criterion: every syntax item in the compatibility manifest is at least tested, without claiming official parity.

## P0 — Multi-file engine

- Local file, directory, and nested includes are resolved; add URL execution-context policies.
- Broad fragment parsing is implemented; add exact insertion-context parsing for ambiguous constructs.
- Original URI/range is retained; add explicit include-provenance chains to semantic symbols.
- Dependency graph, cycle detection, and unsaved-document overlays are implemented; add targeted dependant invalidation.
- Resolve DSL and JSON workspace inheritance.

Exit criterion: cross-file definition, references, rename, and diagnostics pass deterministic fixtures.

## P0 — Official compatibility

- Add an opt-in Java 21 adapter pinned to `structurizr-dsl:6.2.3`.
- Compare parse acceptance, diagnostics, normalized model elements, relationships, and views.
- Run trusted-runtime work out of process with cancellation and timeouts.
- Record every discrepancy in the compatibility manifest.

## P1 — Language intelligence

- Typed completion and completion resolve.
- Hover, references, workspace symbols, semantic tokens, formatting, code actions, and transactional rename.
- Extend the initial relative filesystem completion to every advanced path-bearing construct and semantic owner.

## P1 — Semantic model and diagrams

- Normalize the resolved AST into an editor-independent architecture model.
- Implement all official view semantics before visual rendering.
- Add live preview, stable layout, search, source-to-diagram and diagram-to-source navigation, and export.

## P2 — Product hardening

- Architecture explorer, docs/ADR views, optional architecture linting.
- Performance budgets and large deterministic fixtures.
- Workspace Trust, CSP, resource limits, structured logging, extension-host tests, CI, and VSIX validation.

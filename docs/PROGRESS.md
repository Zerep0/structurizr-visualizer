# Progress

## Milestone 1 — Langium semantic foundation

Date: 2026-10-08

### Implemented

- Replaced the generated quickstart grammar with a line-aware, case-insensitive Structurizr grammar foundation.
- Added AST recognition for fundamental model/deployment constructs, relationships, element metadata, all view names, basic view bodies/styles, configuration, includes, docs, ADRs, and component-discovery directives.
- Added a semantic identifier name provider.
- Added flat and hierarchical intra-file element scopes.
- Added stable diagnostics for duplicate identifiers, illegal element placement, and source-less model relationships.
- Added parser, linker, validation, incomplete completion, Go to Definition, and checked-in example tests.
- Migrated dependency management to pnpm with a committed lockfile and explicit esbuild lifecycle trust.
- Pinned the compatibility baseline and added a schema-backed feature inventory.

### Files changed

- `packages/language/src/structurizr.langium`
- `packages/language/src/structurizr-scope.ts`
- `packages/language/src/structurizr-validator.ts`
- `packages/language/test/grammar.test.ts`
- `packages/extension/src/language/main.ts`
- workspace/package manifests and generated Langium/TextMate output
- `docs/*`

### Verification

- `pnpm langium:generate`: passed.
- `pnpm typecheck`: passed after aligning Langium/LSP dependency resolution.
- `pnpm test`: 11 tests passed.

### Compatibility

No official-parser differential suite exists yet, so official parity remains unverified. The implemented syntax follows the 6.2.3 language reference. The feature manifest distinguishes tested syntax/semantics from recognized-only constructs.

### Known limitations

- Single-document linking only; includes and inheritance are inert AST nodes.
- Generic initial view grammar and incomplete positional validation.
- No archetypes, bulk modification grammar, trusted runtime adapter, semantic model, or diagram renderer.
- Deployment instances are parsed and linked to their base element but cannot yet be relationship endpoints.
- No formatter, rename tests, references tests, semantic tokens, or cross-file editor tests.

### Next milestone

Build the context-preserving include resolver and source map while expanding typed symbols to instances, relationships, views, and archetypes.

## Milestone 2 — Local multi-file includes

Date: 2026-10-08

### Implemented

- Added a `Document` entry rule that accepts either a complete workspace or an included fragment.
- Added local file, directory, and nested include discovery without requiring every fragment to be opened in the editor first.
- Added a connected-document scope for cross-file references while isolating unrelated DSL projects.
- Preserved include-location context for hierarchical identifiers such as `shop.api`.
- Added missing-include and circular-include diagnostics.
- Added fixtures for top-level people fragments, styles fragments, directory includes, and nested includes.
- Fixed `//` and `/* ... */` comments so path tokenization cannot consume them.
- Added `!include` inside `styles`, standalone element/relationship style fragments, and the relationship `style` property.
- Added hexadecimal colors with `#` and reserved style values such as `Person`, `Container`, and `dashed`.
- Completed the Structurizr 6.2.3 style syntax surface: all 19 shapes, `iconPosition`, `light`/`dark`, element and relationship properties, `jump`, legacy relationship flags, nested custom properties, and official inline `themes` syntax.
- Added completion for official shape, icon-position, border, line-style, routing, and boolean style values.
- Added relationship source and operator completion in fragments, sibling-fragment symbols, and segment completion triggered by `.`.
- Added filesystem completion relative to the current document for includes, workspace extension, docs/ADRs, icons, and themes; `/` and `\` retrigger suggestions.

### Verification

- `pnpm typecheck`: passed.
- `pnpm test`: 26 tests passed, including the complete 6.2.3 style token/shape inventory, style-value completion, comments, style fragments, includes inside `styles`, filesystem-path suggestions, automatic fragment loading, cross-file linking and completion, directory and nested includes, hierarchical dot completion, project isolation, missing includes, and cycles.

### Known limitations

- URL includes are recognized but are not fetched.
- Fragment parsing is intentionally broad rather than a byte-for-byte textual preprocessor; ambiguous model/view syntax still needs exact insertion-context parsing.
- Cross-file references, diagnostics, and initial path completion are covered, but references, rename, every advanced path-bearing construct, targeted invalidation, and official-parser differential tests still need dedicated multi-file coverage.
- Style syntax is statically supported; loading remote themes/icons, inlining theme JSON, and rendering style effects remain outside the language server.

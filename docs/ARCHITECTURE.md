# Architecture

## Current system

Structurizr Studio is a TypeScript monorepo with two executable boundaries:

- `packages/language` owns the Langium grammar, generated AST, semantic naming, scope resolution, and validation. It has no VS Code dependency.
- `packages/extension` owns the VS Code language client and the Node language-server process. The server composes the reusable language package and communicates over LSP.

The current request path is:

`VS Code editor -> language client -> LSP server -> Langium document builder -> parser/linker/validator`

The grammar preserves line boundaries as tokens. This is necessary because the official DSL uses positional optional arguments and a newline separates statements. Element display names and DSL identifiers are separate AST properties. `StructurizrNameProvider` exposes only identifiers as semantic names, so navigation and rename operate on references rather than matching text.

## Semantic identifiers

Flat mode exposes every element identifier across the parsed workspace. Hierarchical mode indexes nested elements under qualified names such as `shop.api`; a direct child is also visible by its local identifier from within the containing element. Relationship identifiers remain flat, matching the documented Structurizr rule.

Local file and directory includes form a dependency graph over Langium documents. Included files have a fragment root rather than requiring a second `workspace` declaration. Scope construction follows the connected include graph and preserves the include location when deriving hierarchical names, so a fragment containing `api = container ...` included under `shop = softwareSystem ...` is exposed as `shop.api`.

## Dependency direction

`packages/extension -> packages/language -> Langium`

Future packages must keep editor-independent behavior below the extension:

- workspace resolution and source maps;
- normalized semantic model;
- official-parser compatibility adapter;
- diagram engine and architecture analysis.

No package should execute `!script`, `!plugin`, or `!components` while opening or statically validating a workspace.

## Incremental-processing direction

Langium's document builder remains the owner of in-memory documents and cancellation. The workspace resolver reuses managed documents first, so an unsaved editor buffer wins over filesystem content, and synchronously discovers unopened local fragments when a single root document is built. Missing and circular includes are diagnosed. Targeted dependant invalidation and workspace inheritance remain future work.

## Security boundary

Static parsing, linking, and validation require no Java runtime and perform no network access. Local include resolution is read-only. URL, JVM script, and plugin operations will be separate capabilities gated by workspace trust, explicit settings, cancellation, and timeouts.

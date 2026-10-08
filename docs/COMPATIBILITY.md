# Compatibility

## Baseline

The compatibility baseline was verified on 2026-10-08:

- Structurizr for Java and DSL: `6.2.3`, tag `v6.2.3`, commit `529efa8`.
- Official parser artifact: `com.structurizr:structurizr-dsl:6.2.3`.
- Official runtime requirement: Java 21.
- Langium: `4.4.0`.
- Node.js: 22 LTS; this milestone was executed with 22.14.0. A current patched Node 22 release is recommended.
- VS Code API target: `1.140`.
- Language Server Protocol packages: 3.18.x through vscode-languageserver 10.1.x.

Primary references are the [official language reference](https://docs.structurizr.com/dsl/language), [identifier rules](https://docs.structurizr.com/dsl/identifiers), [parser capability table](https://docs.structurizr.com/dsl/parser), and [Structurizr 6.2.3 source tag](https://github.com/structurizr/structurizr/tree/v6.2.3).

## Reading support claims

The machine-readable inventory is [compatibility.json](./compatibility.json), validated by [compatibility.schema.json](./compatibility.schema.json).

Statuses are deliberately strict:

- `recognized`: the AST retains the syntax, but semantics are not implemented or tested.
- `partial`: part of the named capability is implemented.
- `tested`: repository tests exercise the claimed layer.
- `verified`: differential tests against the official parser establish parity.

No feature currently has `officialParity: verified`. Syntax recognition is not reported as semantic or runtime support.

## Current verified behavior

- Named and unnamed workspaces.
- Significant statement line boundaries.
- Case-insensitive keywords.
- Fundamental person, software-system, container, and relationship parsing.
- Local file and directory includes parsed as standalone fragments.
- Cross-file flat and hierarchical element linking, including include-location qualification.
- Missing-include and circular-include diagnostics.
- Line and block comments in workspaces and fragments.
- Standalone style fragments and includes nested inside `styles` blocks.
- Complete Structurizr DSL 6.2.3 style syntax inventory: all shapes, light/dark schemes, element/relationship properties, custom properties, themes, and legacy relationship style tokens.
- Completion for enumerated style values such as shapes, borders, routing, icon position, and booleans.
- Scope-derived completion for relationship sources, operators, targets, sibling fragments, and hierarchical segments after `.`.
- Filesystem-path completion relative to the current document for includes, workspace extension, docs/ADRs, icons, and themes.
- Go to Definition through Langium references.
- Duplicate-identifier, illegal-placement, and missing-relationship-source diagnostics with stable codes.

## Important gaps

- Positional argument legality is not yet validated for every construct.
- View rules are represented by a broad initial AST and do not yet enforce per-view argument types.
- Local filesystem includes are resolved, but URL includes, workspace inheritance, and exact textual-inlining parity are not yet implemented.
- Fragment parsing uses a broad context-independent root; constructs that are syntactically ambiguous between model and view contexts still need insertion-context parsing.
- Archetypes, bulk modifications, `!script`, and `!plugin` are not parsed.
- Instance references do not yet participate in the common relationship scope.
- No official Java-parser differential harness or renderer exists.
- Style files are parsed and completed statically; icon/theme loading and visual rendering are not executed by the language server.
- Multi-line block comments can hide line boundaries and need compatibility fixtures.

The official parser varies by execution context: local/CLI tooling supports filesystem includes, workspace extension, docs/ADRs, scripts, and plugins, while the browser parser restricts or omits several of these capabilities. The compatibility adapter will model those profiles explicitly.

# Structurizr language services

This package contains the editor-independent Langium implementation:

- `src/structurizr.langium`: grammar and AST shape;
- `src/structurizr-workspace.ts`: local include graph and fragment discovery;
- `src/structurizr-scope.ts`: identifier naming and semantic scope;
- `src/structurizr-completion.ts`: fragment-aware relationship, dotted-name, and filesystem-path completion;
- `src/structurizr-validator.ts`: stable semantic diagnostics;
- `test/grammar.test.ts`: parser, linker, completion, navigation, and validation coverage.

Generated AST, grammar, module, and TextMate files come from:

```text
pnpm langium:generate
```

The package intentionally has no VS Code dependency. See the root [compatibility document](../../docs/COMPATIBILITY.md) before extending support claims.

Included `.dsl` files are parsed as fragments, so they do not need a `workspace { ... }` wrapper. Local file and directory includes participate in linking and validation; remote URL includes are deliberately not fetched.

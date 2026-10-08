# Structurizr Studio

<p align="center">
  <img src="packages/extension/images/icon.png" width="128" alt="Structurizr Studio icon">
</p>

Structurizr Studio brings rich [Structurizr DSL](https://docs.structurizr.com/dsl) language support to Visual Studio Code: syntax highlighting, IntelliSense, validation, navigation, multi-file includes, and complete style editing.

## Highlights

- Context-aware completion for models, relationships, views, configuration, and styles.
- Full Structurizr DSL 6.2.3 style property, value, shape, and color syntax.
- Local file, directory, and nested `!include` support.
- Cross-file completion and Go to Definition for flat and hierarchical identifiers.
- Relative path suggestions for includes, workspace extension, documentation, ADRs, icons, and themes.
- Diagnostics for invalid fragment placement, unresolved references, duplicate identifiers, missing files, and include cycles.

## Install the extension

Build the installable VSIX:

```shell
pnpm install
pnpm package:extension
```

The package is written to `dist/structurizr-studio.vsix`. Install it from VS Code using **Extensions → ... → Install from VSIX...**, or run:

```shell
code --install-extension dist/structurizr-studio.vsix
```

See the [Marketplace README](packages/extension/README.md) for usage, multi-file examples, requirements, privacy, and current limitations.

## Development

Requirements:

- Node.js 22.12 or newer
- pnpm 12.10.1 through Corepack
- Visual Studio Code 1.140.0 or newer to run the packaged extension

```shell
pnpm install
pnpm langium:generate
pnpm typecheck
pnpm test
pnpm build
```

The language server runs without Java and performs no network access. The selected compatibility baseline is Structurizr DSL 6.2.3; features are only described as official-parser verified after differential testing.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Compatibility matrix](docs/COMPATIBILITY.md)
- [Machine-readable compatibility inventory](docs/compatibility.json)
- [Decisions](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Latest progress report](docs/PROGRESS.md)

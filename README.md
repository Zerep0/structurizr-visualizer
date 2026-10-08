<p align="center">
  <img src="packages/extension/images/icon.png" width="152" alt="Structurizr Studio icon">
</p>

<h1 align="center">Structurizr Studio</h1>

<p align="center">
  <strong>Architecture as code, with the editing experience of a real language.</strong>
</p>

<p align="center">
  IDE-grade Structurizr DSL support for Visual Studio Code: IntelliSense, validation, navigation, multi-file includes, and complete style editing.
</p>

<p align="center">
  <a href="https://github.com/Zerep0/structurizr-visualizer/actions/workflows/ci.yml"><img src="https://github.com/Zerep0/structurizr-visualizer/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Zerep0/structurizr-visualizer?color=2563eb" alt="Apache 2.0 license"></a>
  <img src="https://img.shields.io/badge/VS%20Code-1.140%2B-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code 1.140 or newer">
  <img src="https://img.shields.io/badge/Structurizr%20DSL-6.2.3-14b8a6" alt="Structurizr DSL 6.2.3 baseline">
</p>

<p align="center">
  <a href="#-highlights">Highlights</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-multi-file-workspaces">Multi-file</a> ·
  <a href="#-install-the-extension">Installation</a> ·
  <a href="#-development">Development</a>
</p>

---

Structurizr Studio understands complete workspaces and standalone fragments, follows local includes, resolves identifiers across files, and recommends valid DSL and style values exactly where you need them.

> Structurizr Studio is a language extension. It does not render diagrams or replace the official Structurizr parser and exporters.

## ✨ Highlights

| | |
| --- | --- |
| 🧠 **Context-aware IntelliSense**<br>Complete workspace, model, relationship, view, configuration, and style declarations. | 🧩 **Real multi-file projects**<br>Use file, directory, and nested `!include` directives without adding `workspace` blocks to fragments. |
| 🎨 **Complete style editing**<br>Discover style properties and valid values for shapes, colors, borders, routing, fonts, icons, themes, and relationships. | 🔗 **Cross-file navigation**<br>Complete flat and hierarchical identifiers such as `shop.api`, then jump to their definition with `F12`. |
| 📁 **Filesystem suggestions**<br>Complete paths for includes, workspace extension, docs, ADRs, icons, and themes relative to the current file. | 🛡️ **Useful diagnostics**<br>Catch missing files, include cycles, duplicate identifiers, invalid fragment placement, and unresolved references early. |

## 🚀 Quick start

```dsl
workspace "Getting Started" {
    model {
        user = person "User"
        system = softwareSystem "Software System"

        user -> system "Uses"
    }

    views {
        systemContext system "SystemContext" {
            include *
            autolayout lr
        }

        styles {
            element "Software System" {
                background #1168bd
                color #ffffff
                shape RoundedBox
            }
        }
    }
}
```

Use `Ctrl+Space` for suggestions and `F12` to open referenced definitions.

## 🧩 Multi-file workspaces

```text
architecture/
├─ workspace.dsl
├─ model/
│  ├─ people.dsl
│  ├─ systems.dsl
│  └─ relationships.dsl
├─ views/
│  └─ system-context.dsl
└─ styles/
   └─ style.dsl
```

```dsl
workspace {
    model {
        !include model
    }

    views {
        !include views/system-context.dsl

        styles {
            !include styles/style.dsl
        }
    }
}
```

Included files are parsed as contextual fragments. Path completion works for `!include`, `workspace extends`, `!docs`, `!adrs`, `!decisions`, `icon`, and `theme`.

## 📦 Install the extension

Build the installable VSIX from the repository:

```shell
pnpm install
pnpm package:extension
```

The package is written to `dist/structurizr-studio.vsix`. Install it from **Extensions → ... → Install from VSIX...**, or run:

```shell
code --install-extension dist/structurizr-studio.vsix
```

The complete downloader-facing documentation is in the [Marketplace README](packages/extension/README.md).

## ✅ Current compatibility

| Capability | Status |
| --- | :---: |
| Complete workspaces and standalone DSL fragments | ✅ |
| Local file, directory, and nested includes | ✅ |
| Relationships and styles inside included fragments | ✅ |
| Cross-file identifiers, completion, and Go to Definition | ✅ |
| Relative filesystem path completion | ✅ |
| Structurizr DSL 6.2.3 style syntax and values | ✅ |
| URL include downloading | ⚠️ Recognized, not fetched |
| Diagram rendering and exporting | ➖ Use official Structurizr tools |

## 🔒 Privacy

The extension has no telemetry and sends no workspace contents over the network. Static parsing, validation, navigation, and local include resolution run on your machine. Include resolution is read-only.

## 🛠️ Development

Requirements:

- Node.js 22.12 or newer
- pnpm 12.10.1 through Corepack
- Visual Studio Code 1.140.0 or newer

```shell
pnpm install
pnpm langium:generate
pnpm typecheck
pnpm test
pnpm build
```

## 📚 Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Compatibility matrix](docs/COMPATIBILITY.md)
- [Machine-readable compatibility inventory](docs/compatibility.json)
- [Engineering decisions](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Latest progress report](docs/PROGRESS.md)
- [Extension changelog](packages/extension/CHANGELOG.md)

## 💬 Feedback and license

Bug reports and feature requests are welcome in [GitHub Issues](https://github.com/Zerep0/structurizr-visualizer/issues). Structurizr Studio is released under the [Apache License 2.0](LICENSE).

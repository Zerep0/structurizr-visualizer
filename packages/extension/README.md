<p align="center">
  <img src="https://raw.githubusercontent.com/Zerep0/structurizr-visualizer/main/packages/extension/images/icon.png" width="152" alt="Structurizr Visualizer icon">
</p>

<h1 align="center">Structurizr Visualizer</h1>

<p align="center">
  <strong>Architecture as code, with the editing experience of a real language.</strong>
</p>

<p align="center">
  Write, split, navigate, and validate Structurizr DSL workspaces without leaving Visual Studio Code.
</p>

<p align="center">
  <a href="https://github.com/Zerep0/structurizr-visualizer/actions/workflows/ci.yml"><img src="https://github.com/Zerep0/structurizr-visualizer/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="https://github.com/Zerep0/structurizr-visualizer/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Zerep0/structurizr-visualizer?color=2563eb" alt="Apache 2.0 license"></a>
  <img src="https://img.shields.io/badge/VS%20Code-1.140%2B-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code 1.140 or newer">
  <img src="https://img.shields.io/badge/Structurizr%20DSL-6.2.3-14b8a6" alt="Structurizr DSL 6.2.3 baseline">
</p>

<p align="center">
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-multi-file-workspaces">Multi-file</a> ·
  <a href="#-style-with-confidence">Styles</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="https://github.com/Zerep0/structurizr-visualizer/issues">Issues</a>
</p>

---

Structurizr Visualizer adds IDE-grade language tooling to every `.dsl` file. It understands complete workspaces and standalone fragments, follows local includes, resolves identifiers across files, and recommends valid DSL and style values exactly where you need them.

> Structurizr Visualizer is a language extension. It does not render diagrams or replace the official Structurizr parser and exporters.

## ✨ Everything you need to write Structurizr DSL

| | |
| --- | --- |
| 🧠 **Context-aware IntelliSense**<br>Complete workspace, model, relationship, view, configuration, and style declarations. | 🧩 **Real multi-file projects**<br>Use file, directory, and nested `!include` directives without adding `workspace` blocks to fragments. |
| 🎨 **Complete style editing**<br>Discover style properties and valid values for shapes, colors, borders, routing, fonts, icons, themes, and relationships. | 🔗 **Cross-file navigation**<br>Complete flat and hierarchical identifiers such as `shop.api`, then jump to their definition with `F12`. |
| 📁 **Filesystem suggestions**<br>Complete paths for includes, workspace extension, docs, ADRs, icons, and themes relative to the current file. | 🛡️ **Useful diagnostics**<br>Catch missing files, include cycles, duplicate identifiers, invalid fragment placement, and unresolved references early. |

Syntax highlighting, line comments, block comments, bracket matching, and automatic quote/bracket closing are included out of the box.

## 🚀 Quick start

Create `workspace.dsl` and start typing:

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

Use `Ctrl+Space` to request suggestions and `F12` to open the definition of a referenced element.

## 🧩 Multi-file workspaces

Keep large architecture models focused and maintainable:

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

Included files are parsed as contextual fragments, so `people.dsl`, `relationships.dsl`, and `style.dsl` can contain their declarations directly. Start typing a relative path after `!include`; `/` and `\` continue suggestions as you move through folders.

## 🎨 Style with confidence

Style fragments can be reused across workspaces and include element and relationship definitions:

```dsl
element "Critical" {
    shape Hexagon
    background #b91c1c
    color #ffffff
    stroke #7f1d1d
    strokeWidth 5
}

relationship "Relationship" {
    thickness 2
    style dashed
    opacity 90
}
```

Completion covers the Structurizr DSL 6.2.3 style inventory, including the supported shapes and constrained values for routing, border styles, text alignment, metadata, descriptions, and more.

## 📦 Installation

### Install from a VSIX

1. Download `structurizr-visualizer.vsix`.
2. Open the Extensions view in VS Code.
3. Select the `...` menu and choose **Install from VSIX...**.
4. Select the downloaded file and reload VS Code if requested.

Or install it from a terminal:

```shell
code --install-extension structurizr-visualizer.vsix
```

## ✅ Compatibility at a glance

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

Requires Visual Studio Code 1.140.0 or newer.

## 🔒 Local and private by default

The extension contains no telemetry and does not send workspace contents over the network. Static parsing, validation, navigation, and local include resolution run on your machine. Include resolution is read-only.

## 💬 Feedback and support

Found a parsing edge case or missing completion? Open a [GitHub issue](https://github.com/Zerep0/structurizr-visualizer/issues) with a minimal DSL example, your VS Code version, and the extension version.

- [Source code](https://github.com/Zerep0/structurizr-visualizer)
- [Compatibility documentation](https://github.com/Zerep0/structurizr-visualizer/blob/main/docs/COMPATIBILITY.md)
- [Changelog](https://github.com/Zerep0/structurizr-visualizer/blob/main/packages/extension/CHANGELOG.md)
- [Roadmap](https://github.com/Zerep0/structurizr-visualizer/blob/main/docs/ROADMAP.md)

## License

Released under the [Apache License 2.0](https://github.com/Zerep0/structurizr-visualizer/blob/main/LICENSE).

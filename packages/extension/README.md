# Structurizr Studio

<p align="center">
  <img src="images/icon.png" width="128" alt="Structurizr Studio icon">
</p>

Language support for the [Structurizr DSL](https://docs.structurizr.com/dsl) in Visual Studio Code. Build C4 architecture workspaces with syntax highlighting, context-aware completion, validation, navigation, multi-file includes, and full style editing support.

## Features

- Syntax highlighting for `.dsl` files, including line and block comments.
- IntelliSense for workspace, model, views, configuration, and style declarations.
- Completion for style properties and their supported values, including shapes, routing, borders, fonts, opacity, colors, icons, themes, and relationship styles.
- Local file and directory completion for `!include`, `workspace extends`, `!docs`, `!adrs`, `!decisions`, `icon`, and `theme` paths.
- Multi-file workspaces with file, directory, and nested includes. Included fragments do not need their own `workspace` block.
- Cross-file completion and Go to Definition for flat and hierarchical identifiers such as `shop.api`.
- Diagnostics for unresolved references, duplicate identifiers, invalid fragment placement, missing includes, and include cycles.

## Quick start

Create a file named `workspace.dsl`:

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

Open the file in VS Code and use `Ctrl+Space` to request suggestions at any point.

## Multi-file workspaces

Structurizr Studio understands fragments in the context where they are included:

```text
architecture/
├─ workspace.dsl
├─ model/
│  ├─ people.dsl
│  ├─ systems.dsl
│  └─ relationships.dsl
└─ styles/
   └─ style.dsl
```

```dsl
workspace {
    model {
        !include model
    }

    views {
        styles {
            !include styles/style.dsl
        }
    }
}
```

Start typing a relative path after `!include` and the extension will suggest matching files and directories. `/` and `\` retrigger suggestions while traversing folders.

## Installation

### Install from a VSIX

1. Download `structurizr-studio.vsix`.
2. In VS Code, open the Extensions view.
3. Select the `...` menu and choose **Install from VSIX...**.
4. Reload VS Code if requested.

You can also install it from a terminal:

```shell
code --install-extension structurizr-studio.vsix
```

The extension requires Visual Studio Code 1.140.0 or newer.

## Current scope

The language baseline is Structurizr DSL 6.2.3. Local files, local directories, and nested includes are supported. URL includes are recognized but are not downloaded. The extension provides language tooling; it does not render diagrams or replace the official Structurizr parser/exporters.

## Privacy

The extension does not include telemetry and does not send workspace contents over the network. Local include resolution is read-only.

## Feedback and issues

Report bugs and feature requests in the [GitHub issue tracker](https://github.com/Zerep0/structurizr-visualizer/issues).

## Release notes

Version 0.0.1 introduces the language server, multi-file includes, cross-file navigation, path completion, and Structurizr DSL 6.2.3 style support. The packaged extension also contains the complete changelog.

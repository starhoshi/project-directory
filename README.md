<p align="center">
  <img src="https://starhoshi.gallerycdn.vsassets.io/extensions/starhoshi/project-directory/0.0.4/1780979352474/Microsoft.VisualStudio.Services.Icons.Default" width="128" height="128" alt="Project Directory icon">
</p>

<h1 align="center">Project Directory</h1>

<p align="center">
  A lightweight Visual Studio Code extension for keeping your projects close at hand.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=starhoshi.project-directory"><img src="https://img.shields.io/visual-studio-marketplace/v/starhoshi.project-directory?style=flat-square&amp;label=Marketplace" alt="Visual Studio Marketplace version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=starhoshi.project-directory"><img src="https://img.shields.io/visual-studio-marketplace/i/starhoshi.project-directory?style=flat-square" alt="Visual Studio Marketplace installs"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-10B981?style=flat-square" alt="MIT License"></a>
</p>

## Overview

Each project stores only three fields:

- `name`
- `rootPath`
- `tags`

The extension also checks whether each `rootPath` exists on disk. If the directory is missing, the project is shown with a warning icon and a `missing path` label.

## Install

Install [Project Directory from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=starhoshi.project-directory), or run:

```shell
code --install-extension starhoshi.project-directory
```

## Features

- Show saved projects in a dedicated `Projects` Activity Bar view.
- Add the currently open workspace folder as a project from the view title.
- Edit project metadata directly in the dedicated JSON file.
- Refresh projects from the view.
- Group tagged projects by tag.
- Open a project folder in the current window by clicking it, or in a new window from the inline external action.
- Store project metadata in a dedicated JSON file without writing to `settings.json`.
- Expand `~` in project paths to the current user's home directory.
- Mark projects whose `rootPath` directory does not exist.
- Optionally hide projects whose `rootPath` directory does not exist.

## Usage

1. Open the `Projects` view from the Activity Bar.
2. If a folder is open, click the `+` button to add the current workspace folder.
3. After saving, the projects JSON file opens automatically and focuses the saved project.
4. Edit `tags` or other project metadata in JSON.
5. Tagged projects appear under collapsible tag groups.
6. Click a project item to open it in the current window.
7. Hover a project item and click the external icon to open it in a new window.

Saving an already registered `rootPath` updates the existing project instead of creating a duplicate.

If the configured directory no longer exists, the project remains in the list but is displayed with a warning icon. Opening that project shows a warning message instead of switching folders.

Set `hideMissingDirectories` to `true` in the projects JSON file to hide projects whose `rootPath` directory does not exist. The default is `false`, so missing directories remain visible.

```json
{
  "hideMissingDirectories": true,
  "projects": [
    {
      "name": "Example Project",
      "rootPath": "/path/to/example",
      "tags": ["work", "typescript"]
    }
  ]
}
```

## Project Data

Projects are stored in a dedicated JSON file:

```text
~/.config/project-directory/projects.json
```

The file contains the display option and an array of projects:

```json
{
  "hideMissingDirectories": false,
  "projects": [
    {
      "name": "Example Project",
      "rootPath": "/path/to/example",
      "tags": ["work", "typescript"]
    }
  ]
}
```

Existing array-only files are automatically migrated to this object format. If `hideMissingDirectories` is missing, the extension adds it with `false`.

This file is intended for manual editing and external sync tools such as Git, iCloud Drive, Dropbox, Syncthing, or any dotfiles setup. VS Code Settings Sync does not sync this file automatically.

Because this file may contain local usernames and private project names in absolute paths, do not publish it. Use a private repository or another private sync method.

## Development

1. Open this folder in VS Code.
2. Open the `Run and Debug` view.
3. Start the `Run Extension` launch configuration.
4. In the Extension Development Host window, open the `Projects` view from the Activity Bar.

## Files

- `package.json`: Extension manifest, commands, views, and menu contributions.
- `extension.js`: Extension activation, tree data provider, commands, storage, and path validation.
- `resources/project-directory.svg`: Activity Bar and view icon.
- `.vscode/launch.json`: Local extension development launch configuration.

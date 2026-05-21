# Project Directory

Project Directory is a lightweight Visual Studio Code extension for keeping a small list of project directories in the Activity Bar.

Each project stores only three fields:

- `name`
- `rootPath`
- `tags`

The extension also checks whether each `rootPath` exists on disk. If the directory is missing, the project is shown with a warning icon and a `missing path` label.

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

## Project Data

Projects are stored in a dedicated JSON file:

```text
~/.config/project-directory/projects.json
```

The file contains an array of projects:

```json
[
  {
    "name": "Example Project",
    "rootPath": "/path/to/example",
    "tags": ["work", "typescript"]
  }
]
```

This file is intended for manual editing and external sync tools such as Git, iCloud Drive, Dropbox, Syncthing, or any dotfiles setup. VS Code Settings Sync does not sync this file automatically.

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

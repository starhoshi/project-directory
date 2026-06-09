const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

const VIEW_ID = 'projectDirectory.projects';
const HAS_WORKSPACE_FOLDER_CONTEXT = 'projectDirectory.hasWorkspaceFolder';
const PROJECTS_FILE_PATH = path.join(os.homedir(), '.config', 'project-directory', 'projects.json');
let lastReadErrorMessage;

class ProjectTreeItem extends vscode.TreeItem {
  constructor(project, showTags) {
    const exists = directoryExists(project.rootPath);
    super(project.name, vscode.TreeItemCollapsibleState.None);

    this.project = project;
    this.contextValue = 'project';
    this.description = showTags && project.tags.length > 0 ? project.tags.join(', ') : undefined;
    this.tooltip = buildTooltip(project, exists);
    this.resourceUri = vscode.Uri.file(project.rootPath);
    this.command = {
      command: 'projectDirectory.openProjectInCurrentWindow',
      title: 'Open in Current Window',
      arguments: [this]
    };

    if (exists) {
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      this.description = this.description
        ? `${this.description} - missing path`
        : 'missing path';
      this.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('problemsWarningIcon.foreground')
      );
    }
  }
}

class TagTreeItem extends vscode.TreeItem {
  constructor(tag) {
    super(tag, vscode.TreeItemCollapsibleState.Expanded);
    this.tag = tag;
    this.contextValue = 'tag';
    this.iconPath = new vscode.ThemeIcon('tag');
  }
}

class ProjectProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    const projects = getVisibleProjects(getProjects(this.context));
    if (element instanceof TagTreeItem) {
      return projects
        .filter(project => project.tags.includes(element.tag))
        .map(project => new ProjectTreeItem(project, false));
    }

    return getRootItems(projects);
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new ProjectProvider(context);
  const treeView = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: false
  });

  context.subscriptions.push(
    treeView,
    createProjectsFileWatcher(provider),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      updateWorkspaceContext();
    }),
    vscode.commands.registerCommand('projectDirectory.saveProject', async () => {
      const currentProject = currentWorkspaceProjectDefaults(context);
      if (!currentProject) {
        vscode.window.showWarningMessage('Open a folder before saving a project.');
        await updateWorkspaceContext();
        return;
      }

      const projects = tryGetProjects();
      if (!projects) {
        await openProjectsFile();
        return;
      }

      const nextProjects = upsertProject(projects, currentProject);
      await saveProjects(context, nextProjects);
      provider.refresh();
      await openProjectsFile(currentProject);
    }),
    vscode.commands.registerCommand('projectDirectory.openProjectsFile', async () => {
      await openProjectsFile();
    }),
    vscode.commands.registerCommand('projectDirectory.openProjectInCurrentWindow', async item => {
      await openProject(item, false, provider);
    }),
    vscode.commands.registerCommand('projectDirectory.openProjectInNewWindow', async item => {
      await openProject(item, true, provider);
    }),
    vscode.commands.registerCommand('projectDirectory.refreshProjects', () => {
      provider.refresh();
    })
  );

  updateWorkspaceContext();
}

function deactivate() {}

async function openProject(item, forceNewWindow, provider) {
  const project = getProjectFromItem(item);
  if (!project) {
    return;
  }

  if (!directoryExists(project.rootPath)) {
    vscode.window.showWarningMessage(`Directory does not exist: ${project.rootPath}`);
    provider.refresh();
    return;
  }

  await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.rootPath), forceNewWindow);
}

function getProjects(context) {
  return getProjectData().projects;
}

function getProjectData() {
  return tryGetProjectData() || createDefaultProjectData();
}

function tryGetProjects() {
  const data = tryGetProjectData();
  return data ? data.projects : undefined;
}

function tryGetProjectData() {
  try {
    if (!fs.existsSync(PROJECTS_FILE_PATH)) {
      lastReadErrorMessage = undefined;
      return createDefaultProjectData();
    }

    const content = fs.readFileSync(PROJECTS_FILE_PATH, 'utf8').trim();
    if (!content) {
      lastReadErrorMessage = undefined;
      const data = createDefaultProjectData();
      writeProjectData(data);
      return data;
    }

    const parsed = JSON.parse(content);
    const normalized = normalizeProjectData(parsed);
    if (!normalized) {
      showReadErrorOnce(`Project Directory expected an object with projects array in ${PROJECTS_FILE_PATH}.`);
      return undefined;
    }

    if (normalized.shouldSave) {
      writeProjectData(normalized.data);
    }

    lastReadErrorMessage = undefined;
    return normalized.data;
  } catch (error) {
    showReadErrorOnce(`Project Directory could not read ${PROJECTS_FILE_PATH}: ${error.message}`);
    return undefined;
  }
}

function showReadErrorOnce(message) {
  if (message === lastReadErrorMessage) {
    return;
  }

  lastReadErrorMessage = message;
  vscode.window.showWarningMessage(message);
}

async function saveProjects(context, projects) {
  const data = getProjectData();
  writeProjectData({
    ...data,
    projects
  });
}

function writeProjectData(data) {
  fs.mkdirSync(path.dirname(PROJECTS_FILE_PATH), { recursive: true });
  fs.writeFileSync(PROJECTS_FILE_PATH, `${JSON.stringify(normalizeProjectDataForWrite(data), null, 2)}\n`, 'utf8');
}

function createDefaultProjectData() {
  return {
    hideMissingDirectories: false,
    projects: []
  };
}

function normalizeProjectData(value) {
  if (Array.isArray(value)) {
    return {
      data: normalizeProjectDataForWrite({
        hideMissingDirectories: false,
        projects: value
      }),
      shouldSave: true
    };
  }

  if (!value || typeof value !== 'object' || !Array.isArray(value.projects)) {
    return undefined;
  }

  const hasHideMissingDirectories = Object.prototype.hasOwnProperty.call(value, 'hideMissingDirectories');
  const hideMissingDirectories = hasHideMissingDirectories && value.hideMissingDirectories === true;

  return {
    data: normalizeProjectDataForWrite({
      hideMissingDirectories,
      projects: value.projects
    }),
    shouldSave: !hasHideMissingDirectories || typeof value.hideMissingDirectories !== 'boolean'
  };
}

function normalizeProjectDataForWrite(data) {
  return {
    hideMissingDirectories: data.hideMissingDirectories === true,
    projects: data.projects.map(normalizeProject).sort((a, b) => a.name.localeCompare(b.name))
  };
}

function upsertProject(projects, project) {
  const normalized = normalizeProject(project);
  const existingIndex = projects.findIndex(existing => existing.rootPath === normalized.rootPath);
  if (existingIndex === -1) {
    return [...projects, normalized];
  }

  return projects.map((existing, index) => index === existingIndex ? normalized : existing);
}

function getVisibleProjects(projects) {
  if (!shouldHideMissingDirectories()) {
    return projects;
  }

  return projects.filter(project => directoryExists(project.rootPath));
}

function shouldHideMissingDirectories() {
  return getProjectData().hideMissingDirectories;
}

function getRootItems(projects) {
  const taggedProjects = projects.filter(project => project.tags.length > 0);
  const untaggedProjects = projects.filter(project => project.tags.length === 0);
  const tags = [...new Set(taggedProjects.flatMap(project => project.tags))].sort((a, b) => a.localeCompare(b));

  return [
    ...tags.map(tag => new TagTreeItem(tag)),
    ...untaggedProjects.map(project => new ProjectTreeItem(project, false))
  ];
}

function normalizeProject(project) {
  return {
    name: String(project.name || '').trim(),
    rootPath: expandHome(String(project.rootPath || '').trim()),
    tags: Array.isArray(project.tags)
      ? project.tags.map(tag => String(tag).trim()).filter(Boolean)
      : parseTags(project.tags)
  };
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function directoryExists(rootPath) {
  try {
    return fs.statSync(rootPath).isDirectory();
  } catch {
    return false;
  }
}

function expandHome(rootPath) {
  if (rootPath === '~') {
    return process.env.HOME || rootPath;
  }

  if (rootPath.startsWith(`~${path.sep}`)) {
    return path.join(process.env.HOME || '', rootPath.slice(2));
  }

  return rootPath;
}

function currentWorkspaceProjectDefaults(context) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder || folder.uri.scheme !== 'file') {
    return undefined;
  }

  const rootPath = folder.uri.fsPath;
  const existing = getProjects(context).find(project => project.rootPath === rootPath);
  if (existing) {
    return existing;
  }

  return {
    name: folder.name,
    rootPath,
    tags: []
  };
}

async function openProjectsFile(focusProject) {
  fs.mkdirSync(path.dirname(PROJECTS_FILE_PATH), { recursive: true });
  if (!fs.existsSync(PROJECTS_FILE_PATH)) {
    writeProjectData(createDefaultProjectData());
  } else {
    tryGetProjectData();
  }

  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(PROJECTS_FILE_PATH));
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  if (focusProject) {
    await focusProjectInDocument(editor, focusProject);
  }
}

async function focusProjectInDocument(editor, project) {
  await new Promise(resolve => setTimeout(resolve, 50));

  const escapedRootPath = JSON.stringify(project.rootPath).slice(1, -1);
  const rootPathPattern = `"rootPath": "${escapedRootPath}"`;
  const text = editor.document.getText();
  const index = text.indexOf(rootPathPattern);
  if (index === -1) {
    return;
  }

  const tagsPosition = findTagsCursorPosition(editor.document, text, index);
  const line = editor.document.lineAt(tagsPosition.line);
  const range = new vscode.Range(line.range.start, line.range.end);
  editor.selection = new vscode.Selection(tagsPosition, tagsPosition);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  await vscode.commands.executeCommand('revealLine', {
    lineNumber: tagsPosition.line,
    at: 'center'
  });
}

function findTagsCursorPosition(document, text, projectIndex) {
  const tagsIndex = text.indexOf('"tags": [', projectIndex);
  if (tagsIndex === -1) {
    return document.positionAt(projectIndex);
  }

  return document.positionAt(tagsIndex + '"tags": ['.length);
}

function createProjectsFileWatcher(provider) {
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(path.dirname(PROJECTS_FILE_PATH), path.basename(PROJECTS_FILE_PATH))
  );

  watcher.onDidCreate(() => provider.refresh());
  watcher.onDidChange(() => provider.refresh());
  watcher.onDidDelete(() => provider.refresh());
  return watcher;
}

function updateWorkspaceContext() {
  const hasWorkspaceFolder = Boolean(vscode.workspace.workspaceFolders?.some(folder => folder.uri.scheme === 'file'));
  return vscode.commands.executeCommand('setContext', HAS_WORKSPACE_FOLDER_CONTEXT, hasWorkspaceFolder);
}

function buildTooltip(project, exists) {
  const lines = [
    project.name,
    `rootPath: ${project.rootPath}`
  ];

  if (project.tags.length > 0) {
    lines.push(`tags: ${project.tags.join(', ')}`);
  }

  if (!exists) {
    lines.push('warning: directory does not exist');
  }

  return lines.join('\n');
}

function getProjectFromItem(item) {
  if (item instanceof ProjectTreeItem) {
    return item.project;
  }

  return item?.project;
}

module.exports = {
  activate,
  deactivate
};

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { 
  initDatabase, 
  loadProjects, saveProject, deleteProject,
  loadTasks, saveTask, deleteTask,
  loadNotes, saveNote, deleteNote,
  loadReleases, saveRelease, deleteRelease,
  loadPrompts, savePrompt, deletePrompt,
  loadSettings, saveSetting,
  clearAllDatabase, copyAttachmentFile,
  createBackupFile, getBackupsList, restoreBackupFile, deleteBackupFile,
  loadAllActivityLogs
} from './database';
import {
  checkForUpdates,
  downloadUpdateFile,
  installUpdatePackage,
  getUpdateLogsContent,
  openUpdateLogFile,
  initStartupCrashDetector,
  clearStartupCrashFlag,
  repairDatabaseIntegrity,
  checkStartupUpdates,
  checkRollbackOccurred
} from './updater';
import { registerGithubGitHandlers } from './git-github';

app.name = 'Flux Tasks';

let mainWindow: BrowserWindow | null = null;
let recoveryModeActive = false;

function logToFile(message: string) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'app.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Flux Tasks',
    icon: path.join(__dirname, '../assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hidden'
  });

  mainWindow.setMenuBarVisibility(false);

  // Open all external links (target="_blank" or window.open) in the default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Intercept normal in-app navigations to external links and open them in default system browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
      const isLocalHost = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      if (!isDev || !isLocalHost) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  // Production and Development logging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    const logMsg = `[ERROR] did-fail-load: errorCode=${errorCode}, description=${errorDescription}, url=${validatedURL}`;
    logToFile(logMsg);
    
    if (validatedURL.includes('index.html') || validatedURL === 'http://localhost:3000') {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Flux Tasks - Startup Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #0b0b0f;
              color: #e2e8f0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 12px;
              max-width: 500px;
              backdrop-filter: blur(10px);
            }
            h1 { color: #ff52df; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.95em; line-height: 1.5; }
            .error-code {
              font-family: monospace;
              background: rgba(0, 0, 0, 0.3);
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid rgba(255, 255, 255, 0.05);
              color: #ef4444;
              margin: 15px 0;
            }
            button {
              background: linear-gradient(135deg, #007dff, #ff52df);
              color: white;
              border: none;
              padding: 10px 20px;
              font-size: 0.9em;
              font-weight: bold;
              border-radius: 6px;
              cursor: pointer;
              transition: opacity 0.2s;
              margin-top: 15px;
            }
            button:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Startup Loading Error</h1>
            <p>Flux Tasks failed to load its user interface assets. This usually means the frontend bundle files are missing or could not be resolved.</p>
            <div class="error-code">Error: ${errorDescription} (${errorCode})</div>
            <button onclick="window.location.reload()">Retry Loading</button>
          </div>
        </body>
        </html>
      `;
      mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    logToFile(`[CONSOLE][${levels[level] || 'LOG'}] (${path.basename(sourceId)}:${line}) ${message}`);
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  recoveryModeActive = initStartupCrashDetector();

  // Debug logging
  const packageJsonPath = path.join(app.getAppPath(), 'package.json');
  let packageVersion = 'unknown';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageVersion = packageJson.version;
  } catch (e) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      packageVersion = packageJson.version;
    } catch (err) {}
  }
  console.log(`App version from Electron: ${app.getVersion()}`);
  console.log(`Package version: ${packageVersion}`);
  console.log(`Displayed version: ${app.getVersion()}`);
  logToFile(`App version from Electron: ${app.getVersion()}`);
  logToFile(`Package version: ${packageVersion}`);
  logToFile(`Displayed version: ${app.getVersion()}`);

  checkStartupUpdates(recoveryModeActive);
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  clearStartupCrashFlag();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  clearStartupCrashFlag();
});

// IPC REGISTER - Git & GitHub Integration
registerGithubGitHandlers();

// IPC REGISTER - Database Core Operations
ipcMain.handle('db:loadAll', () => {
  const settingsRaw = loadSettings();
  
  // Convert settings keys to typings
  const settings = {
    accentColor: settingsRaw.accentColor || '#3bd2ff',
    glassTint: settingsRaw.glassTint || 'purple',
    gradientStart: settingsRaw.gradientStart || '#007dff',
    gradientEnd: settingsRaw.gradientEnd || '#ff52df',
    bgStyle: settingsRaw.bgStyle || 'orbit',
    glassPreset: settingsRaw.glassPreset || 'frosted',
    language: settingsRaw.language || 'ru',
    onboardingCompleted: settingsRaw.onboardingCompleted || 'false',
    updateChannel: settingsRaw.updateChannel || 'stable',
    taskViewMode: settingsRaw.taskViewMode || 'list',
    projectViewMode: settingsRaw.projectViewMode || 'list'
  };

  return {
    projects: loadProjects(),
    tasks: loadTasks(),
    releases: loadReleases(),
    notes: loadNotes(),
    prompts: loadPrompts(),
    activityLogs: loadAllActivityLogs(),
    settings
  };
});

ipcMain.handle('db:saveTask', (event, task) => {
  saveTask(task);
  return { success: true };
});

ipcMain.handle('db:deleteTask', (event, id) => {
  deleteTask(id);
  return { success: true };
});

ipcMain.handle('db:saveProject', (event, project) => {
  saveProject(project);
  return { success: true };
});

ipcMain.handle('db:deleteProject', (event, id) => {
  deleteProject(id);
  return { success: true };
});

ipcMain.handle('db:saveRelease', (event, release) => {
  saveRelease(release);
  return { success: true };
});

ipcMain.handle('db:deleteRelease', (event, id) => {
  deleteRelease(id);
  return { success: true };
});

ipcMain.handle('db:saveNote', (event, note) => {
  saveNote(note);
  return { success: true };
});

ipcMain.handle('db:deleteNote', (event, id) => {
  deleteNote(id);
  return { success: true };
});

ipcMain.handle('db:savePrompt', (event, prompt) => {
  savePrompt(prompt);
  return { success: true };
});

ipcMain.handle('db:deletePrompt', (event, id) => {
  deletePrompt(id);
  return { success: true };
});

ipcMain.handle('db:saveSettings', (event, settings) => {
  for (const [key, value] of Object.entries(settings)) {
    saveSetting(key, String(value));
  }
  return { success: true };
});

ipcMain.handle('db:resetDatabase', () => {
  clearAllDatabase();
  return { success: true };
});

// IPC REGISTER - Backups
ipcMain.handle('backup:list', () => {
  return getBackupsList();
});

ipcMain.handle('backup:create', (event, type) => {
  return createBackupFile(type);
});

ipcMain.handle('backup:restore', (event, fileName) => {
  try {
    createBackupFile('auto');
  } catch (err) {
    console.error('Failed to create safety backup before restoring backup', err);
  }
  return restoreBackupFile(fileName);
});

ipcMain.handle('backup:delete', (event, fileName) => {
  deleteBackupFile(fileName);
  return { success: true };
});

// IPC REGISTER - Attachments
ipcMain.handle('attachment:save', (event, sourcePath, fileName) => {
  try {
    const savedPath = copyAttachmentFile(sourcePath, fileName);
    return { success: true, path: savedPath };
  } catch (err: any) {
    console.error('Failed to copy attachment file', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('attachment:open', async (event, filePath) => {
  try {
    if (!filePath) {
      logToFile('[ERROR] attachment:open failed: empty filePath provided');
      return { success: false, error: 'Empty file path' };
    }
    if (fs.existsSync(filePath)) {
      const openError = await shell.openPath(filePath);
      if (openError) {
        logToFile(`[ERROR] shell.openPath failed for "${filePath}": ${openError}`);
        return { success: false, error: openError };
      }
      return { success: true };
    } else {
      logToFile(`[ERROR] attachment:open failed: file does not exist at "${filePath}"`);
      return { success: false, error: 'File not found' };
    }
  } catch (err: any) {
    logToFile(`[ERROR] Exception in attachment:open for "${filePath}": ${err.message}`);
    return { success: false, error: err.message };
  }
});

// IPC REGISTER - Dialogs
ipcMain.handle('dialog:selectFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'txt', 'docx', 'log', 'zip'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:selectSaveFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    properties: ['createDirectory', 'showOverwriteConfirmation']
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

// IPC REGISTER - Import / Export
ipcMain.handle('data:export', async (event, format, data) => {
  if (!mainWindow) return { success: false };

  let extensions: string[] = [];
  let name = '';
  switch (format) {
    case 'json':
      extensions = ['json'];
      name = 'JSON Data Archive';
      break;
    case 'md':
      extensions = ['md'];
      name = 'Markdown Document';
      break;
    case 'html':
      extensions = ['html'];
      name = 'HTML Page';
      break;
    case 'csv':
      extensions = ['csv'];
      name = 'CSV Comma Separated Table';
      break;
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Export as ${format.toUpperCase()}`,
    defaultPath: `flux_tasks_export.${format}`,
    filters: [{ name, extensions }]
  });

  if (result.canceled || !result.filePath) return { success: false };

  try {
    let content = '';
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // Export tasks as CSV
      const tasks = data.tasks || [];
      const headers = ['id', 'title', 'projectId', 'priority', 'type', 'status', 'createdDate', 'updatedDate'];
      const csvLines = [headers.join(',')];
      for (const t of tasks) {
        const line = headers.map(h => {
          const val = String((t as any)[h] || '').replace(/"/g, '""');
          return `"${val}"`;
        });
        csvLines.push(line.join(','));
      }
      content = csvLines.join('\n');
    } else if (format === 'html') {
      // Generate clean visual HTML dump
      const tasks = data.tasks || [];
      const projects = data.projects || [];
      const projMap: Record<string, string> = {};
      projects.forEach((p: any) => { projMap[p.id] = p.name; });

      content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Flux Tasks Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b0f; color: #e2e8f0; padding: 40px; }
    h1 { color: #3bd2ff; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
    .project { margin-bottom: 30px; background: #13131a; border-radius: 8px; padding: 20px; border: 1px solid #27273a; }
    .project-title { color: #ff52df; margin-top: 0; font-size: 1.5em; }
    .task { margin: 15px 0; padding: 12px; background: #1e1e2f; border-left: 4px solid #3bd2ff; border-radius: 4px; }
    .task-meta { font-size: 0.85em; color: #94a3b8; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; background: #3b82f6; color: white; }
    .badge.bug { background: #ef4444; }
    .badge.feature { background: #10b981; }
    .badge.release { background: #8b5cf6; }
    .checklist { list-style: none; padding-left: 0; }
    .checklist li { margin: 4px 0; }
    .checked { text-decoration: line-through; color: #64748b; }
  </style>
</head>
<body>
  <h1>Flux Tasks Export Report</h1>
  <p>Exported on: ${new Date().toLocaleString()}</p>
  `;

      // Group tasks by projects
      const tasksByProj: Record<string, any[]> = { 'unassigned': [] };
      projects.forEach((p: any) => { tasksByProj[p.id] = []; });
      tasks.forEach((t: any) => {
        const pid = t.projectId || 'unassigned';
        if (!tasksByProj[pid]) tasksByProj[pid] = [];
        tasksByProj[pid].push(t);
      });

      projects.forEach((p: any) => {
        const pTasks = tasksByProj[p.id] || [];
        content += `
        <div class="project">
          <h2 class="project-title">${p.name}</h2>
          <p>${p.description || ''}</p>
          <div>
        `;
        pTasks.forEach((t: any) => {
          content += `
            <div class="task">
              <h3>${t.title}</h3>
              <div class="task-meta">
                <span class="badge ${t.type}">${t.type.toUpperCase()}</span> | 
                Status: <strong>${t.status}</strong> | 
                Priority: <strong>${t.priority}</strong>
              </div>
              <p>${t.description || 'No description'}</p>
          `;
          if (t.checklist && t.checklist.length > 0) {
            content += '<h4>Checklist:</h4><ul class="checklist">';
            t.checklist.forEach((item: any) => {
              content += `<li class="${item.done ? 'checked' : ''}">
                <input type="checkbox" ${item.done ? 'checked' : ''} disabled> ${item.text}
              </li>`;
            });
            content += '</ul>';
          }
          content += '</div>';
        });
        content += '</div></div>';
      });

      content += '</body></html>';
    } else if (format === 'md') {
      // Export as formatted markdown
      const tasks = data.tasks || [];
      const projects = data.projects || [];
      const notes = data.notes || [];

      content = `# Flux Tasks Document Export\nGenerated: ${new Date().toISOString()}\n\n`;
      content += `## Projects\n\n`;
      for (const p of projects) {
        content += `### Project: ${p.name}\n${p.description || ''}\n\n`;
        const projTasks = tasks.filter((t: any) => t.projectId === p.id);
        for (const t of projTasks) {
          content += `#### [${t.type.toUpperCase()}] ${t.title}\n`;
          content += `* **Status**: ${t.status}\n* **Priority**: ${t.priority}\n\n`;
          content += `${t.description || ''}\n\n`;
          if (t.checklist && t.checklist.length > 0) {
            content += `##### Checklist:\n`;
            for (const item of t.checklist) {
              content += `- [${item.done ? 'x' : ' '}] ${item.text}\n`;
            }
            content += `\n`;
          }
          if (t.notes) {
            content += `##### Additional Notes:\n> ${t.notes}\n\n`;
          }
        }
      }

      if (notes.length > 0) {
        content += `\n## Notes\n\n`;
        for (const n of notes) {
          content += `### Note: ${n.title}\n*Tags: ${n.tags ? n.tags.join(', ') : ''}*\n\n${n.content || ''}\n\n---\n`;
        }
      }
    }

    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    console.error('Failed to export file', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('data:import', async () => {
  if (!mainWindow) return null;
  
  // Auto backup before import
  try {
    createBackupFile('auto');
  } catch (err) {
    console.error('Failed to create auto backup before import', err);
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Tasks Data',
    properties: ['openFile'],
    filters: [
      { name: 'Import Files (JSON, Markdown)', extensions: ['json', 'md'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const fileExt = path.extname(filePath).toLowerCase();

  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    if (fileExt === '.json') {
      const parsed = JSON.parse(rawContent);
      return { type: 'json', data: parsed };
    } else {
      // Very simple parser for Markdown to import tasks
      // Looks for ### [TYPE] Title headings and imports them
      const lines = rawContent.split('\n');
      const tasks: any[] = [];
      let currentTask: any = null;

      for (const line of lines) {
        const headerMatch = line.match(/^####?\s+\[(BUG|FEATURE|RELEASE|REFRACTOR|DOCUMENTATION|PROMPT|REFRACTOR)\]\s+(.+)$/i);
        if (headerMatch) {
          if (currentTask) tasks.push(currentTask);
          const type = headerMatch[1].toLowerCase();
          currentTask = {
            id: `task-imported-${Date.now()}-${tasks.length}`,
            title: headerMatch[2].trim(),
            description: '',
            projectId: 'unassigned',
            priority: 'medium',
            type: type === 'refractor' ? 'refactor' : type,
            status: 'planned',
            tags: ['imported'],
            checklist: [],
            attachments: [],
            prompts: [],
            codeSnippets: [],
            notes: '',
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            history: [{ id: `h-import-${Date.now()}`, timestamp: new Date().toISOString(), action: 'created', details: 'Imported from Markdown file' }]
          };
        } else if (currentTask) {
          // If line starts with checklist item
          const chkMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/i);
          if (chkMatch) {
            currentTask.checklist.push({
              id: `chk-${Date.now()}-${currentTask.checklist.length}`,
              text: chkMatch[2].trim(),
              done: chkMatch[1].toLowerCase() === 'x'
            });
          } else {
            currentTask.description += line + '\n';
          }
        }
      }
      if (currentTask) tasks.push(currentTask);
      return { type: 'md', data: { tasks } };
    }
  } catch (err: any) {
    console.error('Failed to import file', err);
    throw err;
  }
});

// IPC REGISTER - Updates & OTA Auto-Updates
ipcMain.handle('update:check', async (event, channel) => {
  return checkForUpdates(channel);
});

ipcMain.handle('update:download', async (event, manifest) => {
  return downloadUpdateFile(manifest);
});

ipcMain.handle('update:install', async (event, packagePath, isAsarOnly) => {
  return installUpdatePackage(packagePath, isAsarOnly);
});

ipcMain.handle('update:getLogs', () => {
  return getUpdateLogsContent();
});

ipcMain.handle('update:openLog', () => {
  openUpdateLogFile();
  return { success: true };
});

ipcMain.handle('update:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('update:checkRollback', () => {
  return checkRollbackOccurred();
});

// IPC REGISTER - Crash Recovery Mode
ipcMain.handle('recovery:check', () => {
  return { crashed: recoveryModeActive, recoveryMode: recoveryModeActive };
});

ipcMain.handle('recovery:resetFlag', () => {
  clearStartupCrashFlag();
  recoveryModeActive = false;
  return { success: true };
});

ipcMain.handle('recovery:repair', () => {
  return repairDatabaseIntegrity();
});

// IPC REGISTER - Window Controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  mainWindow?.maximize();
});

ipcMain.handle('window:restore', () => {
  mainWindow?.unmaximize();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() || false;
});


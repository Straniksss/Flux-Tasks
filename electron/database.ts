import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { Task, Project, Release, NoteItem, PromptItem, BackupItem, ChecklistItem, Attachment, TaskHistoryItem } from '../src/types';

let db: DatabaseSync | null = null;
let dbPath = '';

export function getAppDataPath() {
  const userDataPath = app.getPath('userData');
  // Ensure application name matches Flux Tasks
  return userDataPath;
}

export function initDatabase() {
  const appData = getAppDataPath();
  if (!fs.existsSync(appData)) {
    fs.mkdirSync(appData, { recursive: true });
  }

  // Create attachments and backups folders
  const attachmentsDir = path.join(appData, 'attachments');
  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const backupsDir = path.join(appData, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  dbPath = path.join(appData, 'tasks.db');
  console.log(`Initializing SQLite database at: ${dbPath}`);
  
  db = new DatabaseSync(dbPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      createdDate TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      projectId TEXT DEFAULT 'unassigned',
      priority TEXT DEFAULT 'none',
      type TEXT DEFAULT 'feature',
      status TEXT DEFAULT 'planned',
      notes TEXT,
      codeSnippets TEXT, -- JSON string
      createdDate TEXT,
      updatedDate TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      name TEXT PRIMARY KEY
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_tags (
      taskId TEXT,
      tag TEXT,
      PRIMARY KEY (taskId, tag),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      text TEXT,
      done INTEGER DEFAULT 0,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      name TEXT NOT NULL,
      size TEXT,
      type TEXT,
      path TEXT, -- relative or absolute path
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      taskId TEXT, -- nullable
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      provider TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      createdDate TEXT,
      updatedDate TEXT,
      tags TEXT -- JSON array of strings
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      changelog TEXT, -- JSON array of strings
      date TEXT,
      status TEXT DEFAULT 'planned'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id TEXT PRIMARY KEY,
      version TEXT,
      title TEXT,
      status TEXT,
      description TEXT,
      date TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      taskId TEXT,
      timestamp TEXT,
      action TEXT,
      details TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // Alter tables for v0.2.0 compatibility
  try {
    db.exec("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN emoji TEXT;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN pinned INTEGER DEFAULT 0;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE prompts ADD COLUMN tags TEXT;");
  } catch (e) {}

  // GitHub & Git Integration Columns
  try {
    db.exec("ALTER TABLE projects ADD COLUMN githubOwner TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN githubRepo TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN githubDefaultBranch TEXT DEFAULT 'main';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN githubRemoteUrl TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE projects ADD COLUMN localPath TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN githubIssueNumber INTEGER;");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN githubIssueUrl TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN githubIssueState TEXT DEFAULT '';");
  } catch (e) {}

  // Run orphan file cleanup on start
  cleanupOrphanAttachments();

  console.log('Database tables successfully verified/created.');
}

// Helpers
function runQuery(sql: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function allQuery(sql: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function getQuery(sql: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

// Transaction block execute helper
function runInTransaction(callback: () => void) {
  if (!db) throw new Error('Database not initialized');
  db.exec('BEGIN TRANSACTION;');
  try {
    callback();
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// CRUD - Projects
export function loadProjects(): Project[] {
  const rows = allQuery('SELECT * FROM projects ORDER BY createdDate ASC');
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    color: r.color || 'indigo',
    icon: r.icon || 'Folder',
    emoji: r.emoji || '',
    status: (r.status as any) || 'active',
    pinned: r.pinned === 1,
    createdDate: r.createdDate,
    githubOwner: r.githubOwner || '',
    githubRepo: r.githubRepo || '',
    githubDefaultBranch: r.githubDefaultBranch || 'main',
    githubRemoteUrl: r.githubRemoteUrl || '',
    localPath: r.localPath || ''
  }));
}

export function saveProject(p: Project) {
  runQuery(
    `INSERT OR REPLACE INTO projects (id, name, description, color, icon, emoji, status, pinned, createdDate, githubOwner, githubRepo, githubDefaultBranch, githubRemoteUrl, localPath)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id, 
      p.name, 
      p.description, 
      p.color, 
      p.icon, 
      p.emoji || '', 
      p.status || 'active', 
      p.pinned ? 1 : 0, 
      p.createdDate,
      p.githubOwner || '',
      p.githubRepo || '',
      p.githubDefaultBranch || 'main',
      p.githubRemoteUrl || '',
      p.localPath || ''
    ]
  );
}

export function deleteProject(id: string) {
  runInTransaction(() => {
    // Delete the project
    runQuery('DELETE FROM projects WHERE id = ?', [id]);
    // Migrate corresponding tasks to "unassigned" to avoid data loss
    runQuery("UPDATE tasks SET projectId = 'unassigned' WHERE projectId = ?", [id]);
  });
}

// CRUD - Tasks
export function loadTasks(): Task[] {
  const taskRows = allQuery('SELECT * FROM tasks ORDER BY createdDate DESC');
  
  // Load related tags, checklist, attachments, prompts, and activity logs (history)
  const tagsRows = allQuery('SELECT * FROM task_tags');
  const checklistRows = allQuery('SELECT * FROM checklist_items');
  const attachmentsRows = allQuery('SELECT * FROM attachments');
  const promptsRows = allQuery('SELECT * FROM prompts WHERE taskId IS NOT NULL');
  const logsRows = allQuery('SELECT * FROM activity_logs ORDER BY timestamp ASC');

  // Build maps for quick lookup
  const tagsMap: Record<string, string[]> = {};
  tagsRows.forEach((r: any) => {
    if (!tagsMap[r.taskId]) tagsMap[r.taskId] = [];
    tagsMap[r.taskId].push(r.tag);
  });

  const checklistMap: Record<string, ChecklistItem[]> = {};
  checklistRows.forEach((r: any) => {
    if (!checklistMap[r.taskId]) checklistMap[r.taskId] = [];
    checklistMap[r.taskId].push({
      id: r.id,
      text: r.text,
      done: r.done === 1
    });
  });

  const attachmentsMap: Record<string, Attachment[]> = {};
  attachmentsRows.forEach((r: any) => {
    if (!attachmentsMap[r.taskId]) attachmentsMap[r.taskId] = [];
    attachmentsMap[r.taskId].push({
      id: r.id,
      name: r.name,
      size: r.size,
      type: r.type,
      url: r.path // Use saved path as url in frontend
    });
  });

  const promptsMap: Record<string, PromptItem[]> = {};
  promptsRows.forEach((r: any) => {
    if (!r.taskId) return;
    if (!promptsMap[r.taskId]) promptsMap[r.taskId] = [];
    let promptTags: string[] = [];
    try {
      if (r.tags) {
        promptTags = JSON.parse(r.tags);
      }
    } catch (e) {}
    promptsMap[r.taskId].push({
      id: r.id,
      title: r.title,
      description: r.description || '',
      content: r.content,
      provider: r.provider || 'custom',
      tags: promptTags
    });
  });

  const logsMap: Record<string, TaskHistoryItem[]> = {};
  logsRows.forEach((r: any) => {
    if (!r.taskId) return;
    if (!logsMap[r.taskId]) logsMap[r.taskId] = [];
    logsMap[r.taskId].push({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      details: r.details
    });
  });

  return taskRows.map((r: any) => {
    let snippets: any[] = [];
    try {
      if (r.codeSnippets) {
        snippets = JSON.parse(r.codeSnippets);
      }
    } catch (e) {
      console.error(`Failed to parse code snippets for task ${r.id}`, e);
    }

    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      projectId: r.projectId || 'unassigned',
      priority: r.priority || 'none',
      type: r.type || 'feature',
      status: r.status || 'planned',
      tags: tagsMap[r.id] || [],
      checklist: checklistMap[r.id] || [],
      attachments: attachmentsMap[r.id] || [],
      prompts: promptsMap[r.id] || [],
      codeSnippets: snippets,
      notes: r.notes || '',
      createdDate: r.createdDate,
      updatedDate: r.updatedDate,
      history: logsMap[r.id] || [],
      githubIssueNumber: r.githubIssueNumber !== undefined ? r.githubIssueNumber : null,
      githubIssueUrl: r.githubIssueUrl || '',
      githubIssueState: r.githubIssueState || ''
    };
  });
}

export function saveTask(t: Task) {
  runInTransaction(() => {
    // 1. Save core task
    runQuery(
      `INSERT INTO tasks (id, title, description, projectId, priority, type, status, notes, codeSnippets, createdDate, updatedDate, githubIssueNumber, githubIssueUrl, githubIssueState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         projectId = excluded.projectId,
         priority = excluded.priority,
         type = excluded.type,
         status = excluded.status,
         notes = excluded.notes,
         codeSnippets = excluded.codeSnippets,
         createdDate = excluded.createdDate,
         updatedDate = excluded.updatedDate,
         githubIssueNumber = excluded.githubIssueNumber,
         githubIssueUrl = excluded.githubIssueUrl,
         githubIssueState = excluded.githubIssueState`,
      [
        t.id,
        t.title,
        t.description,
        t.projectId || 'unassigned',
        t.priority || 'none',
        t.type || 'feature',
        t.status || 'planned',
        t.notes || '',
        JSON.stringify(t.codeSnippets || []),
        t.createdDate,
        t.updatedDate,
        t.githubIssueNumber !== undefined ? t.githubIssueNumber : null,
        t.githubIssueUrl || '',
        t.githubIssueState || ''
      ]
    );

    // 2. Sync Tags
    runQuery('DELETE FROM task_tags WHERE taskId = ?', [t.id]);
    if (t.tags && t.tags.length > 0) {
      for (const tag of t.tags) {
        runQuery('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag]);
        runQuery('INSERT INTO task_tags (taskId, tag) VALUES (?, ?)', [t.id, tag]);
      }
    }

    // 3. Sync Checklist
    runQuery('DELETE FROM checklist_items WHERE taskId = ?', [t.id]);
    if (t.checklist && t.checklist.length > 0) {
      for (const item of t.checklist) {
        runQuery(
          'INSERT INTO checklist_items (id, taskId, text, done) VALUES (?, ?, ?, ?)',
          [item.id, t.id, item.text, item.done ? 1 : 0]
        );
      }
    }

    // 4. Sync Prompts linked to task
    // First, delete tasks' old linked prompts that are NOT global or just delete all linked
    runQuery('DELETE FROM prompts WHERE taskId = ?', [t.id]);
    if (t.prompts && t.prompts.length > 0) {
      for (const p of t.prompts) {
        runQuery(
          'INSERT INTO prompts (id, taskId, title, description, content, provider, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [p.id, t.id, p.title, p.description || '', p.content, p.provider, JSON.stringify(p.tags || [])]
        );
      }
    }

    // 5. Sync Attachments metadata
    runQuery('DELETE FROM attachments WHERE taskId = ?', [t.id]);
    if (t.attachments && t.attachments.length > 0) {
      for (const att of t.attachments) {
        runQuery(
          'INSERT INTO attachments (id, taskId, name, size, type, path) VALUES (?, ?, ?, ?, ?, ?)',
          [att.id, t.id, att.name, att.size, att.type, att.url || '']
        );
      }
    }

    // 6. Sync History (Activity logs)
    runQuery('DELETE FROM activity_logs WHERE taskId = ?', [t.id]);
    if (t.history && t.history.length > 0) {
      for (const log of t.history) {
        runQuery(
          'INSERT INTO activity_logs (id, taskId, timestamp, action, details) VALUES (?, ?, ?, ?, ?)',
          [log.id, t.id, log.timestamp, log.action, log.details]
        );
      }
    }
  });
  // Clean up orphan files immediately after task save
  cleanupOrphanAttachments();
}

export function deleteTask(id: string) {
  runInTransaction(() => {
    // 1. Get task attachments to delete physical files
    const rows = allQuery('SELECT path FROM attachments WHERE taskId = ?', [id]);
    for (const r of rows) {
      try {
        const filePath = r.path as string;
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error(`Failed to delete physical attachment file: ${r.path}`, e);
      }
    }
    // 2. Delete the task
    runQuery('DELETE FROM tasks WHERE id = ?', [id]);
  });
  // Clean up orphan files immediately
  cleanupOrphanAttachments();
}

// CRUD - Notes
export function loadNotes(): NoteItem[] {
  const rows = allQuery('SELECT * FROM notes ORDER BY updatedDate DESC');
  return rows.map((r: any) => {
    let tags: string[] = [];
    try {
      if (r.tags) {
        tags = JSON.parse(r.tags);
      }
    } catch (e) {}
    return {
      id: r.id,
      title: r.title,
      content: r.content || '',
      createdDate: r.createdDate,
      updatedDate: r.updatedDate,
      tags
    };
  });
}

export function saveNote(n: NoteItem) {
  runQuery(
    `INSERT OR REPLACE INTO notes (id, title, content, createdDate, updatedDate, tags)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [n.id, n.title, n.content, n.createdDate, n.updatedDate, JSON.stringify(n.tags || [])]
  );
}

export function deleteNote(id: string) {
  runQuery('DELETE FROM notes WHERE id = ?', [id]);
}

// CRUD - Releases
export function loadReleases(): Release[] {
  const rows = allQuery('SELECT * FROM releases ORDER BY date DESC');
  return rows.map((r: any) => {
    let changes: string[] = [];
    try {
      if (r.changelog) {
        changes = JSON.parse(r.changelog);
      }
    } catch (e) {}
    return {
      id: r.id,
      version: r.version,
      name: r.name,
      description: r.description || '',
      date: r.date,
      changes,
      status: r.status as any
    };
  });
}

export function saveRelease(r: Release) {
  runQuery(
    `INSERT OR REPLACE INTO releases (id, version, name, description, changelog, date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.version, r.name, r.description, JSON.stringify(r.changes || []), r.date, r.status]
  );
}

export function deleteRelease(id: string) {
  runQuery('DELETE FROM releases WHERE id = ?', [id]);
}

// CRUD - Standalone Prompts (Global Prompt Manager)
export function loadPrompts(): PromptItem[] {
  const rows = allQuery('SELECT * FROM prompts WHERE taskId IS NULL');
  return rows.map((r: any) => {
    let promptTags: string[] = [];
    try {
      if (r.tags) {
        promptTags = JSON.parse(r.tags);
      }
    } catch (e) {}
    return {
      id: r.id,
      title: r.title,
      description: r.description || '',
      content: r.content,
      provider: r.provider || 'custom',
      tags: promptTags
    };
  });
}

export function savePrompt(p: PromptItem) {
  runQuery(
    `INSERT OR REPLACE INTO prompts (id, taskId, title, description, content, provider, tags)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [p.id, p.title, p.description || '', p.content, p.provider, JSON.stringify(p.tags || [])]
  );
}

export function deletePrompt(id: string) {
  runQuery('DELETE FROM prompts WHERE id = ?', [id]);
}

// Settings
export function loadSettings(): Record<string, string> {
  const rows = allQuery('SELECT * FROM settings');
  const res: Record<string, string> = {};
  rows.forEach((r: any) => {
    res[r.key] = r.value;
  });
  return res;
}

export function saveSetting(key: string, value: string) {
  runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

// Attachments storage engine
export function copyAttachmentFile(sourcePath: string, fileName: string): string {
  const appData = getAppDataPath();
  const destDir = path.join(appData, 'attachments');
  const finalName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = path.join(destDir, finalName);
  
  fs.copyFileSync(sourcePath, destPath);
  
  // Return the path relative to appData or the full path (we can use full path directly)
  return destPath;
}

// Backup & Restore
export function getDatabasePath(): string {
  return dbPath;
}

function getFormattedBackupFileName(type: 'auto' | 'manual'): string {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `backup_${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}_${type}.db`;
}

export function createBackupFile(type: 'auto' | 'manual' = 'manual'): BackupItem {
  const appData = getAppDataPath();
  const backupsDir = path.join(appData, 'backups');
  
  const timestamp = new Date().toISOString();
  const backupFileName = getFormattedBackupFileName(type);
  const destPath = path.join(backupsDir, backupFileName);

  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, destPath);
  }

  // Count active tasks and projects
  const taskCount = (getQuery('SELECT COUNT(*) as count FROM tasks') as any)?.count || 0;
  const projectCount = (getQuery('SELECT COUNT(*) as count FROM projects') as any)?.count || 0;
  
  let sizeBytes = 0;
  try {
    if (fs.existsSync(destPath)) {
      sizeBytes = fs.statSync(destPath).size;
    }
  } catch (e) {}

  return {
    id: backupFileName,
    timestamp,
    type,
    taskCount,
    projectCount,
    sizeBytes
  };
}

export function runBackupRetention(): number {
  try {
    const appData = getAppDataPath();
    const backupsDir = path.join(appData, 'backups');
    if (!fs.existsSync(backupsDir)) return 0;

    // Load settings to find backupRetentionDays
    const settings = loadSettings();
    const retentionDays = parseInt(settings.backupRetentionDays ?? '3', 10);
    const now = Date.now();

    const files = fs.readdirSync(backupsDir);
    let deletedCount = 0;

    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('_auto.db')) {
        const fullPath = path.join(backupsDir, file);
        const parts = file.split('_');
        
        let timestampStr = '';
        if (parts.length === 3) {
          // Old format: backup_ISOString_auto.db
          timestampStr = parts[1].replace(/-/g, ':');
        } else if (parts.length >= 4) {
          // New format: backup_YYYY-MM-DD_HH-mm-ss_auto.db
          const dateStr = parts[1];
          const timeStr = parts[2].replace(/-/g, ':');
          timestampStr = `${dateStr}T${timeStr}`;
        }

        if (timestampStr) {
          const backupDate = new Date(timestampStr);
          if (!isNaN(backupDate.getTime())) {
            const ageInMs = now - backupDate.getTime();
            const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
            if (ageInDays > retentionDays) {
              fs.unlinkSync(fullPath);
              deletedCount++;
            }
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`Backup retention: automatically deleted ${deletedCount} old auto backups.`);
    }
    return deletedCount;
  } catch (err) {
    console.error('Failed to run backup retention:', err);
    return 0;
  }
}

export function getBackupsList(): BackupItem[] {
  const appData = getAppDataPath();
  const backupsDir = path.join(appData, 'backups');
  if (!fs.existsSync(backupsDir)) return [];

  const files = fs.readdirSync(backupsDir);
  const backups: BackupItem[] = [];

  for (const file of files) {
    if (file.startsWith('backup_') && file.endsWith('.db')) {
      const parts = file.split('_');
      if (parts.length >= 3) {
        let timestamp = '';
        let typePart = 'manual';
        
        if (parts.length === 3) {
          // Old format: backup_ISOString_type.db
          timestamp = parts[1].replace(/-/g, ':');
          typePart = parts[2].split('.')[0];
        } else if (parts.length >= 4) {
          // New format: backup_YYYY-MM-DD_HH-mm-ss_type.db
          const dateStr = parts[1]; // YYYY-MM-DD
          const timeStr = parts[2].replace(/-/g, ':'); // HH:mm:ss
          timestamp = `${dateStr}T${timeStr}`;
          typePart = parts[3].split('.')[0];
        }

        const fullPath = path.join(backupsDir, file);
        let sizeBytes = 0;
        try {
          sizeBytes = fs.statSync(fullPath).size;
        } catch (e) {}

        backups.push({
          id: file,
          timestamp,
          type: typePart === 'auto' ? 'auto' : 'manual',
          taskCount: 0,
          projectCount: 0,
          sizeBytes
        });
      }
    }
  }

  return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function restoreBackupFile(fileName: string): boolean {
  if (!db) throw new Error('Database not initialized');
  const appData = getAppDataPath();
  const backupPath = path.join(appData, 'backups', fileName);

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file does not exist: ${backupPath}`);
    return false;
  }

  // Close active connection
  db = null;

  // Copy backup over tasks.db
  fs.copyFileSync(backupPath, dbPath);

  // Re-initialize database connection
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  console.log(`Database successfully restored from: ${fileName}`);
  return true;
}

export function deleteBackupFile(fileName: string) {
  const appData = getAppDataPath();
  const backupPath = path.join(appData, 'backups', fileName);
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

// Reset Database completely
export function clearAllDatabase() {
  runInTransaction(() => {
    runQuery('DELETE FROM activity_logs');
    runQuery('DELETE FROM checklist_items');
    runQuery('DELETE FROM task_tags');
    runQuery('DELETE FROM tags');
    runQuery('DELETE FROM attachments');
    runQuery('DELETE FROM prompts');
    runQuery('DELETE FROM tasks');
    runQuery('DELETE FROM projects');
    runQuery('DELETE FROM notes');
    runQuery('DELETE FROM releases');
    runQuery('DELETE FROM roadmap_items');
    runQuery('DELETE FROM settings');
  });
}

// Clean up orphan attachments files that are no longer referenced in SQLite
export function cleanupOrphanAttachments() {
  try {
    const appData = getAppDataPath();
    const attachmentsDir = path.join(appData, 'attachments');
    if (!fs.existsSync(attachmentsDir)) return;

    const physicalFiles = fs.readdirSync(attachmentsDir);
    const referencedRows = allQuery('SELECT path FROM attachments');
    const referencedPaths = new Set(referencedRows.map((r: any) => path.resolve(r.path)));

    let cleanedCount = 0;
    for (const file of physicalFiles) {
      const fullPath = path.resolve(attachmentsDir, file);
      if (!referencedPaths.has(fullPath)) {
        fs.unlinkSync(fullPath);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} orphan attachments.`);
    }
  } catch (err) {
    console.error('Failed to cleanup orphan attachments', err);
  }
}

// Load all activity logs (global history, capped for performance)
export function loadAllActivityLogs(): any[] {
  return allQuery('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200');
}

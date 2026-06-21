export type TaskType = 'bug' | 'feature' | 'release' | 'refactor' | 'documentation' | 'prompt';

export type TaskStatus = 'planned' | 'pending' | 'in_progress' | 'testing' | 'completed' | 'cancelled';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  content?: string; // Text representation or dataURL
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
}

export interface PromptItem {
  id: string;
  title: string;
  description?: string;
  content: string;
  provider: 'chatgpt' | 'gemini' | 'claude' | 'custom';
  tags?: string[];
}

export interface TaskHistoryItem {
  id: string;
  timestamp: string;
  action: string; // e.g., 'created', 'status_changed', 'priority_changed', etc.
  details: string; // Description text (localized dynamically or pre-rendered)
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string; // "unassigned" or project UUID
  priority: TaskPriority;
  type: TaskType;
  status: TaskStatus;
  tags: string[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  prompts: PromptItem[];
  codeSnippets: CodeSnippet[];
  notes: string;
  createdDate: string;
  updatedDate: string;
  history: TaskHistoryItem[];
  githubIssueNumber?: number | null;
  githubIssueUrl?: string;
  githubIssueState?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind tint: e.g. 'emerald', 'sky', 'rose', etc
  icon: string; // Lucide icon name
  emoji?: string;
  status: 'active' | 'archived';
  pinned: boolean;
  createdDate: string;
  githubOwner?: string;
  githubRepo?: string;
  githubDefaultBranch?: string;
  githubRemoteUrl?: string;
  localPath?: string;
}

export interface Release {
  id: string;
  version: string;
  name: string;
  description: string;
  date: string;
  changes: string[]; // List of change descriptions
  status: 'planned' | 'completed';
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdDate: string;
  updatedDate: string;
  tags: string[];
}

export type AppLanguage = 'ru' | 'uk' | 'en';

export type GlassPreset = 'crystal' | 'frosted' | 'acrylic' | 'ultra-blur' | 'minimal';

export type BackgroundStyle = 'orbit' | 'aurora' | 'deep-noir' | 'crystal-lake';

export interface DesignSystem {
  accentColor: string; // hex representation
  glassTint: 'neutral' | 'blue' | 'purple' | 'emerald' | 'amber';
  gradientStart: string; // hex
  gradientEnd: string; // hex
  bgStyle: BackgroundStyle;
  glassPreset: GlassPreset;
  taskViewMode?: 'list' | 'kanban';
  projectViewMode?: 'list' | 'kanban';
}

export interface BackupItem {
  id: string;
  timestamp: string;
  type: 'auto' | 'manual';
  taskCount: number;
  projectCount: number;
}

export interface ElectronAPI {
  loadAll: () => Promise<{
    projects: Project[];
    tasks: Task[];
    releases: Release[];
    notes: NoteItem[];
    prompts: PromptItem[];
    activityLogs: any[];
    settings: {
      accentColor: string;
      glassTint: string;
      gradientStart: string;
      gradientEnd: string;
      bgStyle: string;
      glassPreset: string;
      language: string;
      onboardingCompleted: string;
      updateChannel: string;
      taskViewMode: string;
      projectViewMode: string;
    };
  }>;
  saveTask: (task: Task) => Promise<{ success: boolean }>;
  deleteTask: (id: string) => Promise<{ success: boolean }>;
  saveProject: (project: Project) => Promise<{ success: boolean }>;
  deleteProject: (id: string) => Promise<{ success: boolean }>;
  saveRelease: (release: Release) => Promise<{ success: boolean }>;
  deleteRelease: (id: string) => Promise<{ success: boolean }>;
  saveNote: (note: NoteItem) => Promise<{ success: boolean }>;
  deleteNote: (id: string) => Promise<{ success: boolean }>;
  savePrompt: (prompt: PromptItem) => Promise<{ success: boolean }>;
  deletePrompt: (id: string) => Promise<{ success: boolean }>;
  saveSettings: (settings: Record<string, string>) => Promise<{ success: boolean }>;
  resetDatabase: () => Promise<{ success: boolean }>;
  getBackups: () => Promise<BackupItem[]>;
  createBackup: (type: 'auto' | 'manual') => Promise<BackupItem>;
  restoreBackup: (fileName: string) => Promise<boolean>;
  deleteBackup: (fileName: string) => Promise<{ success: boolean }>;
  saveAttachment: (sourcePath: string, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  openAttachment: (filePath?: string) => Promise<{ success: boolean; error?: string }>;
  selectFile: (options?: any) => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  selectSaveFile: (options?: any) => Promise<string | null>;
  exportData: (format: 'json' | 'md' | 'html' | 'csv', data: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  importData: () => Promise<{ type: 'json' | 'md'; data: any } | null>;

  // Updates & Maintenance
  checkForUpdates: (channel: string) => Promise<{ updateAvailable: boolean; manifest?: any; error?: string }>;
  downloadUpdate: (manifest: any) => Promise<{ success: boolean; packagePath?: string; error?: string }>;
  installUpdate: (packagePath: string, isAsarOnly: boolean) => Promise<{ success: boolean; error?: string }>;
  getUpdateLogs: () => Promise<string>;
  openUpdateLog: () => Promise<void>;
  getCurrentVersion: () => Promise<string>;
  checkRollback: () => Promise<{ occurred: boolean; error?: string }>;
  app: {
    getVersion: () => Promise<string>;
  };

  // Crash Recovery & Database Repairs
  checkStartupCrash: () => Promise<{ crashed: boolean; recoveryMode: boolean }>;
  resetAppCrashFlag: () => Promise<void>;
  repairDatabase: () => Promise<{ success: boolean; log: string[] }>;

  // Window Controls
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    restore: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  // GitHub Integration API
  github: {
    connect: (token: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    disconnect: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<{ connected: boolean; online?: boolean; clientId?: string; clientSecret?: string; user?: any; error?: string }>;
    startOAuth: (clientId: string, clientSecret: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    fetchRepos: () => Promise<{ success: boolean; repos?: any[]; error?: string }>;
    getRepositoryDashboard: (owner: string, repo: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    fetchIssues: (owner: string, repo: string) => Promise<{ success: boolean; issues?: any[]; error?: string }>;
    getIssue: (owner: string, repo: string, number: number) => Promise<{ success: boolean; issue?: any; error?: string }>;
    createIssue: (owner: string, repo: string, issue: { title: string; body: string; labels: string[] }) => Promise<{ success: boolean; issue?: any; error?: string }>;
    updateIssueStatus: (owner: string, repo: string, number: number, state: 'open' | 'closed') => Promise<{ success: boolean; error?: string }>;
    getReleases: (owner: string, repo: string) => Promise<{ success: boolean; releases?: any[]; error?: string }>;
    createRelease: (owner: string, repo: string, releaseData: { tag_name: string; name: string; body: string; draft: boolean; prerelease: boolean }) => Promise<{ success: boolean; release?: any; error?: string }>;
    uploadReleaseAsset: (owner: string, repo: string, releaseId: number, filePath: string, name: string) => Promise<{ success: boolean; asset?: any; error?: string }>;
  };

  // Git Local API
  git: {
    getStatus: (localPath: string) => Promise<{ success: boolean; status?: any; error?: string }>;
    pull: (localPath: string) => Promise<{ success: boolean; output?: string; error?: string }>;
    push: (localPath: string) => Promise<{ success: boolean; output?: string; error?: string }>;
    commit: (localPath: string, message: string) => Promise<{ success: boolean; output?: string; error?: string }>;
    tag: (localPath: string, tagName: string, message?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
    openFolder: (localPath: string) => Promise<{ success: boolean; error?: string }>;
    openTerminal: (localPath: string) => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

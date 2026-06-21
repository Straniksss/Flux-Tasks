import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Task, Project, Release, NoteItem, DesignSystem, AppLanguage, 
  TaskStatus, TaskPriority, TaskType, BackupItem, PromptItem
} from './types';


export interface TaskTemplate {
  type: TaskType;
  titleKey: string;
  description: string;
  color: string;
  icon: string;
  defaultChecklist: string[];
  defaultPriority: TaskPriority;
  descriptionTemplate: string;
}

export const TASK_TEMPLATES: Record<TaskType, TaskTemplate> = {
  bug: {
    type: 'bug',
    titleKey: 'typeBug',
    description: 'Описание и отслеживание программных ошибок',
    color: 'from-rose-500 to-red-600 border-rose-500/30 text-rose-400',
    icon: 'Bug',
    defaultChecklist: ['Шаги воспроизведения записаны', 'Лог-файлы приложены', 'Ошибка исправлена и протестирована'],
    defaultPriority: 'high',
    descriptionTemplate: '### Шаги для воспроизведения:\n1. \n2. \n\n### Ожидаемое поведение:\n\n### Фактическое поведение:\n'
  },
  feature: {
    type: 'feature',
    titleKey: 'typeFeature',
    description: 'Новая функциональность или улучшение',
    color: 'from-emerald-400 to-teal-500 border-emerald-400/30 text-emerald-400',
    icon: 'Sparkles',
    defaultChecklist: ['Спецификация согласована', 'Разработка завершена', 'Юнит-тесты добавлены'],
    defaultPriority: 'medium',
    descriptionTemplate: '### Описание фичи:\n\n### Пользовательские сценарии:\n- \n\n### Требования к реализации:\n'
  },
  release: {
    type: 'release',
    titleKey: 'typeRelease',
    description: 'Планирование и отслеживание выпуска версии',
    color: 'from-purple-500 to-indigo-600 border-purple-500/30 text-purple-400',
    icon: 'Rocket',
    defaultChecklist: ['Сборка протестирована', 'Changelog сгенерирован', 'Развертывание на продакшн'],
    defaultPriority: 'urgent',
    descriptionTemplate: '### Объем релиза:\n\n### План развертывания:\n1. \n\n### План отката:\n'
  },
  refactor: {
    type: 'refactor',
    titleKey: 'typeRefactor',
    description: 'Улучшение архитектуры и качества кода',
    color: 'from-orange-400 to-amber-500 border-orange-400/30 text-orange-400',
    icon: 'Wrench',
    defaultChecklist: ['Старый код проанализирован', 'Тесты не упали', 'Ревью кода пройдено'],
    defaultPriority: 'low',
    descriptionTemplate: '### Текущее состояние:\n\n### Предлагаемые изменения:\n\n### Влияние на систему и риски:\n'
  },
  documentation: {
    type: 'documentation',
    titleKey: 'typeDocumentation',
    description: 'Спецификации, руководства и база знаний',
    color: 'from-cyan-400 to-sky-500 border-cyan-400/30 text-cyan-400',
    icon: 'BookOpen',
    defaultChecklist: ['Черновик написан', 'Орфография проверена', 'Опубликовано в вики'],
    defaultPriority: 'low',
    descriptionTemplate: '### Целевая аудитория:\n\n### План документа:\n1. \n\n### Ссылки и источники:\n'
  },
  prompt: {
    type: 'prompt',
    titleKey: 'typePrompt',
    description: 'Полезный промпт для нейросетей (Gemini, Claude, ChatGPT)',
    color: 'from-indigo-400 to-violet-500 border-indigo-400/30 text-indigo-400',
    icon: 'Cpu',
    defaultChecklist: ['Промпт отлажен на тестовых кейсах', 'Описана сфера применения', 'Добавлена в менеджер промптов'],
    defaultPriority: 'medium',
    descriptionTemplate: '### Системный промпт:\n\n### Входные данные:\n\n### Примеры работы:\n'
  }
};

interface StoreContextType {
  tasks: Task[];
  projects: Project[];
  releases: Release[];
  notes: NoteItem[];
  prompts: PromptItem[];
  activityLogs: any[];
  settings: DesignSystem & { language: AppLanguage; onboardingCompleted: string; updateChannel: string; taskViewMode: 'list' | 'kanban'; projectViewMode: 'list' | 'kanban' };
  backups: BackupItem[];
  filters: {
    projectId: string; // 'all' or specific
    priority: string;   // 'all' or specific
    tag: string;        // 'all' or specific
    status: string;     // 'all' or specific
    search: string;
  };
  currentView: string;
  selectedProjectViewId: string | null;
  selectedTagViewName: string | null;
  selectedTask: Task | null;
  isCreateModalOpen: boolean;
  createModalInitialType: TaskType | null;
  createModalInitialStatus: TaskStatus | null;
  projectTab: 'tasks' | 'git';
  setProjectTab: (tab: 'tasks' | 'git') => void;

  // Actions
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  setCurrentView: (view: string) => void;
  setSelectedProjectViewId: (id: string | null) => void;
  setSelectedTagViewName: (name: string | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setIsCreateModalOpen: (open: boolean, type?: TaskType | null, status?: TaskStatus | null) => void;
  
  addTask: (task: Omit<Task, 'id' | 'createdDate' | 'updatedDate' | 'history'>) => Promise<Task>;
  updateTask: (task: Task, changeMessage?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProject: (name: string, description: string, color: string, icon: string, emoji?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  addRelease: (version: string, name: string, description: string, date: string, changes: string[]) => Promise<Release>;
  updateReleaseStatus: (id: string, status: 'planned' | 'completed' | 'in_progress' | 'testing' | 'released' | 'cancelled') => Promise<void>;
  deleteRelease: (id: string) => Promise<void>;
  addNote: (title: string, content: string, tags: string[]) => Promise<NoteItem>;
  updateNote: (id: string, title: string, content: string, tags: string[]) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addPrompt: (title: string, description: string, content: string, provider: 'chatgpt' | 'gemini' | 'claude' | 'custom', tags?: string[]) => Promise<PromptItem>;
  updatePrompt: (id: string, title: string, description: string, content: string, provider: 'chatgpt' | 'gemini' | 'claude' | 'custom', tags?: string[]) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  updateSettings: (key: keyof (DesignSystem & { language: AppLanguage; onboardingCompleted: string; updateChannel: string; taskViewMode: 'list' | 'kanban'; projectViewMode: 'list' | 'kanban' }), value: any) => Promise<void>;
  triggerBackup: (type?: 'auto' | 'manual') => Promise<void>;
  restoreFromBackup: (fileName: string) => Promise<{ success: boolean; error?: string }>;
  deleteBackup: (fileName: string) => Promise<void>;
  loadAllFromDB: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: DesignSystem & { language: AppLanguage; onboardingCompleted: string; updateChannel: string; taskViewMode: 'list' | 'kanban'; projectViewMode: 'list' | 'kanban' } = {
  accentColor: '#3bd2ff',
  glassTint: 'purple',
  gradientStart: '#007dff',
  gradientEnd: '#ff52df',
  bgStyle: 'orbit',
  glassPreset: 'frosted',
  language: 'ru',
  onboardingCompleted: 'false',
  updateChannel: 'stable',
  taskViewMode: 'list',
  projectViewMode: 'list'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<DesignSystem & { language: AppLanguage; onboardingCompleted: string; updateChannel: string; taskViewMode: 'list' | 'kanban'; projectViewMode: 'list' | 'kanban' }>(DEFAULT_SETTINGS);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // UI States
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedProjectViewId, setSelectedProjectViewId] = useState<string | null>(null);
  const [selectedTagViewName, setSelectedTagViewName] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<TaskType | null>(null);
  const [createModalInitialStatus, setCreateModalInitialStatus] = useState<TaskStatus | null>(null);
  const [projectTab, setProjectTab] = useState<'tasks' | 'git'>('tasks');

  useEffect(() => {
    setProjectTab('tasks');
  }, [selectedProjectViewId]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  const [filters, setFilters] = useState({
    projectId: 'all',
    priority: 'all',
    tag: 'all',
    status: 'all',
    search: ''
  });

  // Load everything from SQLite database via Electron API
  const loadAllFromDB = async () => {
    setIsLoading(true);
    if (window.api) {
      try {
        const data = await window.api.loadAll();
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setReleases(data.releases || []);
        setNotes(data.notes || []);
        setPrompts(data.prompts || []);
        setActivityLogs(data.activityLogs || []);
        
        // Merge settings
        let loadedSettings = { ...data.settings };
        if (
          (data.projects && data.projects.length > 0) ||
          (data.tasks && data.tasks.length > 0)
        ) {
          if (loadedSettings.onboardingCompleted !== 'true') {
            loadedSettings.onboardingCompleted = 'true';
            window.api.saveSettings({ onboardingCompleted: 'true' });
          }
        }

        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...loadedSettings
          }));
        }

        // Fetch backups list
        const backupsList = await window.api.getBackups();
        setBackups(backupsList || []);
      } catch (err) {
        console.error('Failed to load SQLite data in React store', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllFromDB();
  }, []);

  const triggerBackup = async (type: 'auto' | 'manual' = 'manual') => {
    if (window.api) {
      try {
        await window.api.createBackup(type);
        const backupsList = await window.api.getBackups();
        setBackups(backupsList || []);
      } catch (err) {
        console.error('Failed to trigger backup', err);
      }
    }
  };

  // Actions
  const addTask = async (newTaskInput: Omit<Task, 'id' | 'createdDate' | 'updatedDate' | 'history'>) => {
    const freshId = `task-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const createdTask: Task = {
      ...newTaskInput,
      id: freshId,
      createdDate: nowStr,
      updatedDate: nowStr,
      history: [
        { id: `h-${Date.now()}-1`, timestamp: nowStr, action: 'created', details: 'Task initiated' }
      ]
    };

    setTasks(prev => [createdTask, ...prev]);

    const newLog = {
      id: `h-${Date.now()}-1`,
      taskId: freshId,
      timestamp: nowStr,
      action: 'created',
      details: 'Task initiated'
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 200));

    if (window.api) {
      window.api.saveTask(createdTask).then(() => {
        triggerBackup('auto');
      }).catch(err => {
        console.error('Failed to save task in DB asynchronously', err);
      });
    }
    return createdTask;
  };

  const updateTask = async (updatedTask: Task, changeMessage?: string) => {
    const nowStr = new Date().toISOString();
    const logId = `h-${Date.now()}-changed`;
    const newLogItem = { id: logId, timestamp: nowStr, action: 'edited', details: changeMessage || 'Task details modified' };
    const taskWithUpdate = {
      ...updatedTask,
      updatedDate: nowStr,
      history: [
        ...(updatedTask.history || []),
        newLogItem
      ]
    };

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? taskWithUpdate : t));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(taskWithUpdate);
    }

    const newLog = {
      id: logId,
      taskId: updatedTask.id,
      timestamp: nowStr,
      action: 'edited',
      details: changeMessage || 'Task details modified'
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 200));

    if (window.api) {
      window.api.saveTask(taskWithUpdate).catch(err => {
        console.error('Failed to save updated task in DB asynchronously', err);
      });
    }
  };

  const deleteTask = async (id: string) => {
    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }

    setTasks(prev => prev.filter(t => t.id !== id));
    setActivityLogs(prev => prev.filter(log => log.taskId !== id));

    if (window.api) {
      window.api.deleteTask(id).then(() => {
        triggerBackup('auto');
      }).catch(err => {
        console.error('Failed to delete task in DB asynchronously', err);
      });
    }
  };

  const addProject = async (name: string, description: string, color: string, icon: string, emoji?: string) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      color,
      icon,
      emoji: emoji || '',
      status: 'active',
      pinned: false,
      createdDate: new Date().toISOString()
    };

    setProjects(prev => [...prev, newProj]);

    if (window.api) {
      window.api.saveProject(newProj).then(() => {
        triggerBackup('auto');
      }).catch(err => {
        console.error('Failed to add project in DB asynchronously', err);
      });
    }
    return newProj;
  };

  const updateProject = async (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));

    if (window.api) {
      window.api.saveProject(project).catch(err => {
        console.error('Failed to update project in DB asynchronously', err);
      });
    }
  };

  const deleteProject = async (id: string) => {
    if (selectedProjectViewId === id) {
      setSelectedProjectViewId(null);
      setCurrentView('all_tasks');
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: 'unassigned' } : t));

    if (window.api) {
      window.api.deleteProject(id).then(() => {
        triggerBackup('auto');
      }).catch(err => {
        console.error('Failed to delete project in DB asynchronously', err);
      });
    }
  };

  const addRelease = async (version: string, name: string, description: string, date: string, changes: string[]) => {
    const newRel: Release = {
      id: `rel-${Date.now()}`,
      version,
      name,
      description,
      date,
      changes,
      status: 'planned'
    };

    setReleases(prev => [...prev, newRel]);

    if (window.api) {
      window.api.saveRelease(newRel).catch(err => {
        console.error('Failed to add release in DB asynchronously', err);
      });
    }
    return newRel;
  };

  const updateReleaseStatus = async (id: string, status: 'planned' | 'completed' | 'in_progress' | 'testing' | 'released' | 'cancelled') => {
    setReleases(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, status };
        if (window.api) {
          window.api.saveRelease(updated).catch(err => {
            console.error('Failed to update release status in DB asynchronously', err);
          });
        }
        return updated;
      }
      return r;
    }));
  };

  const deleteRelease = async (id: string) => {
    setReleases(prev => prev.filter(r => r.id !== id));

    if (window.api) {
      window.api.deleteRelease(id).catch(err => {
        console.error('Failed to delete release in DB asynchronously', err);
      });
    }
  };

  const addNote = async (title: string, content: string, tags: string[]) => {
    const nowStr = new Date().toISOString();
    const newNoteObj: NoteItem = {
      id: `note-${Date.now()}`,
      title,
      content,
      createdDate: nowStr,
      updatedDate: nowStr,
      tags
    };

    setNotes(prev => [newNoteObj, ...prev]);

    if (window.api) {
      window.api.saveNote(newNoteObj).catch(err => {
        console.error('Failed to add note in DB asynchronously', err);
      });
    }
    return newNoteObj;
  };

  const updateNote = async (id: string, title: string, content: string, tags: string[]) => {
    const nowStr = new Date().toISOString();
    const updatedNote = {
      id,
      title,
      content,
      tags,
      createdDate: notes.find(n => n.id === id)?.createdDate || nowStr,
      updatedDate: nowStr
    };

    setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));

    if (window.api) {
      window.api.saveNote(updatedNote).catch(err => {
        console.error('Failed to update note in DB asynchronously', err);
      });
    }
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));

    if (window.api) {
      window.api.deleteNote(id).catch(err => {
        console.error('Failed to delete note in DB asynchronously', err);
      });
    }
  };

  // Prompts actions
  const addPrompt = async (title: string, description: string, content: string, provider: 'chatgpt' | 'gemini' | 'claude' | 'custom', tags: string[] = []) => {
    const newPromptObj: PromptItem = {
      id: `prompt-${Date.now()}`,
      title,
      description,
      content,
      provider,
      tags
    };

    setPrompts(prev => [newPromptObj, ...prev]);

    if (window.api) {
      window.api.savePrompt(newPromptObj).catch(err => {
        console.error('Failed to add prompt in DB asynchronously', err);
      });
    }
    return newPromptObj;
  };

  const updatePrompt = async (id: string, title: string, description: string, content: string, provider: 'chatgpt' | 'gemini' | 'claude' | 'custom', tags: string[] = []) => {
    const updatedPromptObj: PromptItem = {
      id,
      title,
      description,
      content,
      provider,
      tags
    };

    setPrompts(prev => prev.map(p => p.id === id ? updatedPromptObj : p));

    if (window.api) {
      window.api.savePrompt(updatedPromptObj).catch(err => {
        console.error('Failed to update prompt in DB asynchronously', err);
      });
    }
  };

  const deletePrompt = async (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));

    if (window.api) {
      window.api.deletePrompt(id).catch(err => {
        console.error('Failed to delete prompt in DB asynchronously', err);
      });
    }
  };

  const updateSettings = async (key: keyof (DesignSystem & { language: AppLanguage; onboardingCompleted: string; updateChannel: string }), value: any) => {
    const updated = {
      ...settings,
      [key]: value
    };
    setSettings(updated);

    if (window.api) {
      const mappedRaw: Record<string, string> = {};
      Object.entries(updated).forEach(([k, v]) => {
        mappedRaw[k] = String(v);
      });
      await window.api.saveSettings(mappedRaw);
    }
  };

  const restoreFromBackup = async (fileName: string) => {
    if (window.api) {
      try {
        const success = await window.api.restoreBackup(fileName);
        if (success) {
          await loadAllFromDB();
          return { success: true };
        }
        return { success: false, error: 'Database restore operation failed.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Error occurred.' };
      }
    }
    return { success: false, error: 'API not available.' };
  };

  const deleteBackup = async (fileName: string) => {
    if (window.api) {
      try {
        await window.api.deleteBackup(fileName);
        const backupsList = await window.api.getBackups();
        setBackups(backupsList || []);
      } catch (err) {
        console.error('Failed to delete backup file', err);
      }
    }
  };

  const resetDatabase = async () => {
    setTasks([]);
    setProjects([]);
    setReleases([]);
    setNotes([]);
    setPrompts([]);
    setActivityLogs([]);
    setSettings(DEFAULT_SETTINGS);
    setBackups([]);

    if (window.api) {
      await window.api.resetDatabase();
    }
  };

  const handleOpenCreateModal = (open: boolean, type?: TaskType | null, status?: TaskStatus | null) => {
    setIsCreateModalOpen(open);
    if (open) {
      setCreateModalInitialType(type || 'feature');
      setCreateModalInitialStatus(status || 'planned');
    } else {
      setCreateModalInitialType(null);
      setCreateModalInitialStatus(null);
    }
  };

  return (
    <StoreContext.Provider value={{
      tasks,
      projects,
      releases,
      notes,
      prompts,
      activityLogs,
      settings,
      backups,
      filters,
      currentView,
      selectedProjectViewId,
      selectedTagViewName,
      selectedTask,
      isCreateModalOpen,
      createModalInitialType,
      createModalInitialStatus,
      projectTab,
      setProjectTab,

      setFilters,
      setCurrentView,
      setSelectedProjectViewId,
      setSelectedTagViewName,
      setSelectedTask,
      setIsCreateModalOpen: handleOpenCreateModal,

      addTask,
      updateTask,
      deleteTask,
      addProject,
      deleteProject,
      updateProject,
      addRelease,
      updateReleaseStatus,
      deleteRelease,
      addNote,
      updateNote,
      deleteNote,
      addPrompt,
      updatePrompt,
      deletePrompt,
      updateSettings,
      triggerBackup,
      restoreFromBackup,
      deleteBackup,
      resetDatabase,
      loadAllFromDB,
      toast,
      showToast,
      hideToast,
      isLoading
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be wrapped inside StoreProvider');
  }
  return context;
};

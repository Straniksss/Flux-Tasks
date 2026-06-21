import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskListView } from './components/TaskListView';
import { NewTaskModal } from './components/NewTaskModal';
import { TaskDetailView } from './components/TaskDetailView';
import { NotesView } from './components/NotesView';
import { GitHubProjectDashboard } from './components/GitHubProjectDashboard';
import { RoadmapView } from './components/RoadmapView';
import { SettingsView } from './components/SettingsView';
import { PromptsView } from './components/PromptsView';
import { Onboarding } from './components/Onboarding';
import { HistoryView } from './components/HistoryView';
import { ArchiveView } from './components/ArchiveView';
import { CommandPalette } from './components/CommandPalette';
import { TitleBar } from './components/TitleBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getTranslation } from './localization';
import * as Icons from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskType } from './types';

function WorkspaceApp() {
  const {
    tasks,
    projects,
    isLoading,
    currentView,
    selectedProjectViewId,
    selectedTagViewName,
    selectedTask,
    setSelectedTask,
    updateTask,
    deleteTask,
    settings,
    filters,
    setFilters,
    setIsCreateModalOpen,
    setCurrentView,
    setSelectedProjectViewId,
    setSelectedTagViewName,
    toast,
    showToast,
    hideToast,
    projectTab
  } = useStore();

  const lang = settings.language;
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Recovery & Update states
  const [crashedOnStartup, setCrashedOnStartup] = useState(false);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  const [updateManifest, setUpdateManifest] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  React.useEffect(() => {
    const performStartupChecks = async () => {
      if (window.api) {
        try {
          const res = await window.api.checkStartupCrash();
          if (res.crashed) {
            setCrashedOnStartup(true);
            setRepairLogs([
              lang === 'ru' ? 'ВНИМАНИЕ: Обнаружен сбой при предыдущем запуске.' : 'WARNING: Previous startup crash detected.',
              lang === 'ru' ? 'Приложение запущено в защищенном режиме восстановления.' : 'The application has launched in secure Recovery Mode.'
            ]);
            return;
          }
        } catch (e) {}

        try {
          const res = await window.api.checkForUpdates(settings.updateChannel || 'stable');
          if (res.updateAvailable && res.manifest) {
            const skipped = localStorage.getItem(`skip_version_${res.manifest.version}`);
            if (skipped !== 'true') {
              setUpdateManifest(res.manifest);
              setShowUpdateModal(true);
            }
          }
        } catch (e) {}
      }
    };

    performStartupChecks();
  }, [settings.updateChannel, lang]);

  const handleRepairDB = async () => {
    if (!window.api) return;
    setIsRepairing(true);
    setRepairLogs(prev => [...prev, lang === 'ru' ? 'Запуск проверки целостности БД...' : 'Running database integrity checks...']);
    try {
      const res = await window.api.repairDatabase();
      setRepairLogs(prev => [...prev, ...res.log]);
      if (res.success) {
        setRepairLogs(prev => [...prev, lang === 'ru' ? 'База данных в порядке! Перезапуск...' : 'Database is OK! Rebooting...']);
        setTimeout(async () => {
          await window.api?.resetAppCrashFlag();
          window.location.reload();
        }, 3000);
      } else {
        setRepairLogs(prev => [...prev, lang === 'ru' ? 'Ошибка исправления. Попробуйте восстановить бэкап.' : 'Repair failed. Try restoring a backup.']);
      }
    } catch (err: any) {
      setRepairLogs(prev => [...prev, `Error: ${err.message}`]);
    }
    setIsRepairing(false);
  };

  const handleRestoreLatestBackup = async () => {
    if (!window.api) return;
    setIsRepairing(true);
    setRepairLogs(prev => [...prev, lang === 'ru' ? 'Поиск резервных копий...' : 'Searching for backups...']);
    try {
      const baks = await window.api.getBackups();
      if (baks.length > 0) {
        const latest = baks[0];
        setRepairLogs(prev => [...prev, lang === 'ru' ? `Восстановление из ${latest.id}...` : `Restoring from ${latest.id}...`]);
        const success = await window.api.restoreBackup(latest.id);
        if (success) {
          setRepairLogs(prev => [...prev, lang === 'ru' ? 'Успешно восстановлено! Перезапуск...' : 'Restore successful! Rebooting...']);
          setTimeout(async () => {
            await window.api?.resetAppCrashFlag();
            window.location.reload();
          }, 3000);
        } else {
          setRepairLogs(prev => [...prev, lang === 'ru' ? 'Сбой восстановления базы данных.' : 'Failed to restore database.']);
        }
      } else {
        setRepairLogs(prev => [...prev, lang === 'ru' ? 'Резервные копии не найдены.' : 'No backups found.']);
      }
    } catch (err: any) {
      setRepairLogs(prev => [...prev, `Error: ${err.message}`]);
    }
    setIsRepairing(false);
  };

  const handleResetEverything = async () => {
    if (!window.api) return;
    const confirmMsg = lang === 'ru' 
      ? 'Вы действительно хотите сбросить ВСЕ данные и настройки? Это действие необратимо.' 
      : 'Are you sure you want to reset ALL data and settings? This cannot be undone.';
    if (confirm(confirmMsg)) {
      setIsRepairing(true);
      try {
        await window.api.resetDatabase();
        setRepairLogs(prev => [...prev, lang === 'ru' ? 'База данных успешно сброшена! Перезапуск...' : 'Database successfully reset! Rebooting...']);
        setTimeout(async () => {
          await window.api?.resetAppCrashFlag();
          window.location.reload();
        }, 2000);
      } catch (err: any) {
        setRepairLogs(prev => [...prev, `Error: ${err.message}`]);
      }
      setIsRepairing(false);
    }
  };

  const handleContinueAnyway = async () => {
    if (window.api) {
      await window.api.resetAppCrashFlag();
    }
    setCrashedOnStartup(false);
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;

      // Ctrl + N — новая задача
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsCreateModalOpen(true);
        return;
      }

      // Ctrl + K — поиск
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ctrl + P — проекты
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCurrentView('all_tasks');
        setSelectedProjectViewId(null);
        setSelectedTagViewName(null);
        setTimeout(() => {
          const selectElement = document.querySelector('select');
          if (selectElement) {
            selectElement.focus();
          }
        }, 100);
        return;
      }

      // Ctrl + S — сохранить
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const activeSaveBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (activeSaveBtn) {
          activeSaveBtn.click();
        }
        return;
      }

      // Delete — удалить задачу
      if (e.key === 'Delete' && !isInput && selectedTask) {
        e.preventDefault();
        const confirmMsg = lang === 'ru' 
          ? `Вы уверены, что хотите удалить задачу "${selectedTask.title}"?` 
          : lang === 'uk' 
            ? `Ви впевнені, що хочете видалити завдання "${selectedTask.title}"?`
            : `Are you sure you want to delete task "${selectedTask.title}"?`;
        if (confirm(confirmMsg)) {
          deleteTask(selectedTask.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedTask, lang, deleteTask, setIsCreateModalOpen, setCurrentView, setSelectedProjectViewId, setSelectedTagViewName]);

  // Resolve Glass Preset Class
  const getGlassPresetClass = (preset: string) => {
    switch (preset) {
      case 'crystal':
        return 'backdrop-blur-md bg-white/[0.03] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]';
      case 'acrylic':
        return 'backdrop-blur-2xl bg-[#0a0a0a]/80 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)]';
      case 'ultra-blur':
        return 'backdrop-blur-[45px] bg-[#050505]/65 border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)]';
      case 'minimal':
        return 'bg-[#050505] border border-white/10 shadow-md';
      case 'frosted':
      default:
        return 'backdrop-blur-xl bg-[#0a0a0a]/80 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)]';
    }
  };

  const getRootGlassPresetClass = (preset: string) => {
    switch (preset) {
      case 'crystal':
        return 'backdrop-blur-md bg-white/[0.03]';
      case 'acrylic':
        return 'backdrop-blur-2xl bg-[#0a0a0a]/85';
      case 'ultra-blur':
        return 'backdrop-blur-[45px] bg-[#050505]/80';
      case 'minimal':
        return 'bg-[#050505]';
      case 'frosted':
      default:
        return 'backdrop-blur-xl bg-[#0a0a0a]/85';
    }
  };

  // Helper colors for status badges
  const getStatusColor = (st: string) => {
    switch (st) {
      case 'planned': return 'text-sky-400 bg-sky-500/10 border-sky-400/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'in_progress': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'testing': return 'text-purple-400 bg-purple-500/10 border-purple-400/20';
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20';
      default: return 'text-rose-400 bg-rose-500/10 border-rose-400/20';
    }
  };

  // Resolve custom icon for task type
  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'bug': return <Icons.Bug className="w-3.5 h-3.5" />;
      case 'feature': return <Icons.Sparkles className="w-3.5 h-3.5" />;
      case 'release': return <Icons.Rocket className="w-3.5 h-3.5" />;
      case 'refactor': return <Icons.Wrench className="w-3.5 h-3.5" />;
      case 'documentation': return <Icons.BookOpen className="w-3.5 h-3.5" />;
      case 'prompt': return <Icons.Cpu className="w-3.5 h-3.5" />;
      default: return <Icons.FileText className="w-3.5 h-3.5" />;
    }
  };

  const getPriorityIcon = (prio: string) => {
    switch (prio) {
      case 'urgent': return <Icons.AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'high': return <Icons.ChevronUp className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case 'medium': return <Icons.Minus className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'low': return <Icons.ChevronDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default: return <Icons.CircleDot className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  // Filter tasks dynamically for tasks pages list or kanban (memoized for performance)
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(t => {
      // Filter by global sidebar views
      // If currentView is a workflow status:
      if (['planned', 'pending', 'in_progress', 'testing', 'completed', 'cancelled'].includes(currentView)) {
        if (t.status !== currentView) return false;
      }

      // Filter by active project clicked in sidebar
      if (selectedProjectViewId) {
        if (t.projectId !== selectedProjectViewId) return false;
      }

      // Filter by tag clicked in sidebar
      if (selectedTagViewName) {
        if (!t.tags.includes(selectedTagViewName)) return false;
      }

      // Filter by top search bar query
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesSnippet = (t.codeSnippets || []).some(c => c.code.toLowerCase().includes(query) || c.title.toLowerCase().includes(query));
        const matchesPrompt = (t.prompts || []).some(p => p.content.toLowerCase().includes(query) || p.title.toLowerCase().includes(query));
        const matchesNotes = (t.notes || '').toLowerCase().includes(query);
        const matchesTags = (t.tags || []).some(tg => tg.toLowerCase().includes(query));

        if (!matchesTitle && !matchesDesc && !matchesSnippet && !matchesPrompt && !matchesNotes && !matchesTags) {
          return false;
        }
      }

      // Filter by drop selectors
      if (filters.projectId !== 'all' && t.projectId !== filters.projectId) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.tag !== 'all' && !t.tags.includes(filters.tag)) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if ((filters as any).type && (filters as any).type !== 'all' && t.type !== (filters as any).type) return false;

      return true;
    });
  }, [tasks, currentView, selectedProjectViewId, selectedTagViewName, filters]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-base text-white select-none">
        <Icons.Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return <Onboarding />;
  }

  // Extract all dynamic tags in view for filter dropdown
  const allTagsList = Array.from(new Set(tasks.flatMap(t => t.tags || []))).filter(Boolean);

  const getActiveViewTitle = () => {
    if (selectedProjectViewId) {
      const p = projects.find(proj => proj.id === selectedProjectViewId);
      return p ? `${getTranslation(lang, 'projects')}: ${p.name}` : getTranslation(lang, 'allTasks');
    }
    if (selectedTagViewName) {
      return `Tag: #${selectedTagViewName}`;
    }
    if (['planned', 'pending', 'in_progress', 'testing', 'completed', 'cancelled'].includes(currentView)) {
      return getTranslation(lang, currentView as any);
    }
    return getTranslation(lang, 'allTasks');
  };

  // Helper values for background style
  const renderBackgroundGlows = () => {
    if (settings.bgStyle === 'deep-noir') {
      return (
        <div className="absolute inset-0 bg-[#010103] overflow-hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>
      );
    }

    let col1 = 'from-[#2d5ff5]/12'; // Softer indigo-blue
    let col2 = 'from-[#a855f7]/8';  // Softer purple
    let col3 = 'from-[#0ea5e9]/6';  // Softer sky blue

    if (settings.bgStyle === 'aurora') {
      col1 = 'from-teal-500/20';
      col2 = 'from-emerald-400/15';
      col3 = 'from-cyan-500/12';
    } else if (settings.bgStyle === 'crystal-lake') {
      col1 = 'from-blue-600/15';
      col2 = 'from-indigo-500/12';
      col3 = 'from-cyan-400/15';
    } else if (settings.bgStyle === 'orbit') {
      // Dynamic orbital colors matching user custom accent
      col1 = `from-[${settings.gradientStart}]/15`;
      col2 = `from-[${settings.gradientEnd}]/12`;
      col3 = 'from-purple-500/10';
    }

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Soft atmospheric background orbs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr ${col1} to-transparent blur-[130px] animate-glow-slow-1`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr ${col2} to-transparent blur-[150px] animate-glow-slow-2`} />
        <div className={`absolute top-[30%] left-[25%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr ${col3} to-transparent blur-[110px] opacity-70`} />

        {/* Dynamic, visually responsive high-fidelity tilted glass sheets replication from the brand banner */}
        <div className="absolute right-[-150px] top-[10%] hidden xl:flex lg:flex-col items-center gap-0 pointer-events-none select-none opacity-25 mix-blend-screen scale-110">
          {/* Backmost card sheet with soft border */}
          <div className="w-[300px] h-[550px] rounded-[36px] border border-white/[0.015] bg-white/[0.002] shadow-[0_45px_100px_rgba(0,0,0,0.8)] transform rotate-[25deg] translate-y-[120px] -translate-x-[40px] backdrop-blur-[2px] transition-transform duration-1000" />
          
          {/* Middle card sheet with purple glowing edge */}
          <div className="absolute w-[310px] h-[570px] rounded-[40px] border border-[#a855f7]/10 bg-[#030307]/10 shadow-[0_20px_50px_rgba(168,85,247,0.04)] transform rotate-[25deg] translate-y-[60px] -translate-x-[20px] backdrop-blur-[6px]" />
          
          {/* Frontmost card sheet with cyber blue/cyan glow */}
          <div className="absolute w-[320px] h-[590px] rounded-[44px] border border-[#3f8cff]/15 bg-[#010103]/30 shadow-[0_25px_60px_rgba(63,140,255,0.08)] transform rotate-[25deg] backdrop-blur-[12px] border-t-[#3f8cff]/20" />
        </div>
      </div>
    );
  };

  if (crashedOnStartup) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#050508] p-4 text-slate-100 antialiased font-sans">
         <div className="w-full max-w-xl p-6 rounded-2xl border border-rose-500/25 bg-slate-950/40 backdrop-blur-xl shadow-2xl space-y-6">
           <div className="flex items-center gap-3 text-rose-400">
             <Icons.AlertTriangle className="w-8 h-8 shrink-0 animate-bounce" />
             <div>
               <h1 className="text-lg font-bold tracking-tight">{lang === 'ru' ? 'Режим восстановления' : lang === 'uk' ? 'Режим відновлення' : 'Recovery Mode'}</h1>
               <p className="text-xs text-slate-400">{lang === 'ru' ? 'Обнаружен критический сбой при запуске' : lang === 'uk' ? 'Виявлено критичний збій при запуску' : 'Critical startup failure detected'}</p>
             </div>
           </div>

           <div className="p-4 rounded-xl border border-white/5 bg-black/40 font-mono text-[10px] text-slate-300 space-y-1 max-h-40 overflow-y-auto">
             {repairLogs.map((log, idx) => (
               <div key={idx}>{log}</div>
             ))}
           </div>

           <div className="grid grid-cols-2 gap-3 select-none text-xs">
             <button
               onClick={handleRepairDB}
               disabled={isRepairing}
               className="py-2.5 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:text-white font-bold text-slate-200 cursor-pointer disabled:opacity-50 text-center"
             >
               {lang === 'ru' ? 'Проверить и исправить БД' : lang === 'uk' ? 'Перевірити та виправити БД' : 'Repair DB'}
             </button>

             <button
               onClick={handleRestoreLatestBackup}
               disabled={isRepairing}
               className="py-2.5 px-4 rounded-xl border border-white/5 bg-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/30 cursor-pointer disabled:opacity-50 text-center"
             >
               {lang === 'ru' ? 'Восстановить бэкап' : lang === 'uk' ? 'Відновити бекап' : 'Restore Last Backup'}
             </button>

             <button
               onClick={handleResetEverything}
               disabled={isRepairing}
               className="py-2.5 px-4 rounded-xl border border-transparent hover:bg-rose-500/10 text-rose-400 border-white/5 cursor-pointer disabled:opacity-50 text-center"
             >
               {lang === 'ru' ? 'Сбросить все настройки' : lang === 'uk' ? 'Скинути всі налаштування' : 'Reset All Settings'}
             </button>

             <button
               onClick={handleContinueAnyway}
               disabled={isRepairing}
               className="py-2.5 px-4 rounded-xl bg-white text-slate-950 font-bold hover:bg-slate-200 cursor-pointer disabled:opacity-50 text-center"
             >
               {lang === 'ru' ? 'Продолжить запуск' : lang === 'uk' ? 'Продовжити запуск' : 'Ignore & Continue'}
             </button>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden flex flex-col p-0 m-0 text-slate-100 antialiased font-sans transition-all duration-300 bg-[#020512]"
      style={{
        // Inject custom accent variable
        // This coordinates custom color codes throughout any utility elements
        ['--color-accent' as any]: settings.accentColor
      }}
    >
      {/* Background themed glows */}
      {renderBackgroundGlows()}

      {/* Main Glass Deck Wrapper */}
      <div 
        className={`w-full h-full flex flex-col overflow-hidden z-10 transition-all border-none rounded-none ${getRootGlassPresetClass(settings.glassPreset)}`}
      >
        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden w-full h-full p-3 pt-0 gap-3 bg-transparent">
          {/* SIDEBAR NAVIGATION */}
          <Sidebar />

          {/* WORKSPACE CENTRAL WORKSTATION SHEET */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/[0.015] backdrop-blur-[36px] rounded-b-2xl rounded-t-none border border-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            {/* INTEGRATED CUSTOM TITLE BAR */}
            <TitleBar />
          
          {/* TOP INTERACTIVE FILTER BAR (Omit on dashboard or notes specific full views) */}
          {!selectedTask && !['dashboard', 'notes', 'roadmap', 'settings'].includes(currentView) && (
            <div className="p-4 border-b border-white/10 bg-[#0a0a0a]/50 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
              
              {/* Left View title & search */}
              <div className="flex-1 flex items-center gap-4 min-w-0">
                {/* Instant search block */}
                <div className="relative flex-1 max-w-md">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder={getTranslation(lang, 'searchPlaceholder')}
                    className="w-full py-1.5 pl-9 pr-4 rounded-xl border border-white/5 bg-slate-900/45 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  {filters.search && (
                    <Icons.X 
                      onClick={() => setFilters(f => ({ ...f, search: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 hover:text-white cursor-pointer"
                    />
                  )}
                </div>
              </div>

              {/* Right Select Dropdowns filtering */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-[10px] text-slate-500 font-bold uppercase">{getTranslation(lang, 'filterBy')}:</div>
                
                {/* Project select filter */}
                <select
                  value={filters.projectId}
                  onChange={(e) => setFilters(f => ({ ...f, projectId: e.target.value }))}
                  className="py-1 px-2.5 rounded border border-white/5 bg-slate-900/40 text-[10px] text-slate-300 font-semibold focus:outline-none"
                >
                  <option value="all">{getTranslation(lang, 'filterProject')}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="unassigned">{getTranslation(lang, 'unassigned')}</option>
                </select>

                {/* Status select filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="py-1 px-2.5 rounded border border-white/5 bg-slate-900/40 text-[10px] text-slate-300 font-semibold focus:outline-none"
                >
                  <option value="all">{lang === 'ru' ? 'Все статусы' : lang === 'uk' ? 'Всі статуси' : 'All Statuses'}</option>
                  <option value="planned">{getTranslation(lang, 'planned')}</option>
                  <option value="pending">{getTranslation(lang, 'pending')}</option>
                  <option value="in_progress">{getTranslation(lang, 'in_progress')}</option>
                  <option value="testing">{getTranslation(lang, 'testing')}</option>
                  <option value="completed">{getTranslation(lang, 'completed')}</option>
                  <option value="cancelled">{getTranslation(lang, 'cancelled')}</option>
                </select>

                {/* Priority select filter */}
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                  className="py-1 px-2.5 rounded border border-white/5 bg-slate-900/40 text-[10px] text-slate-300 font-semibold focus:outline-none capitalize"
                >
                  <option value="all">{getTranslation(lang, 'filterPriority')}</option>
                  {['urgent', 'high', 'medium', 'low', 'none'].map((p) => (
                    <option key={p} value={p}>{getTranslation(lang, `priority${p.charAt(0).toUpperCase() + p.slice(1)}` as any)}</option>
                  ))}
                </select>

                {/* Type select filter */}
                <select
                  value={(filters as any).type || 'all'}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="py-1 px-2.5 rounded border border-white/5 bg-slate-900/40 text-[10px] text-slate-300 font-semibold focus:outline-none"
                >
                  <option value="all">{lang === 'ru' ? 'Все типы' : lang === 'uk' ? 'Всі типи' : 'All Types'}</option>
                  <option value="bug">{getTranslation(lang, 'typeBug')}</option>
                  <option value="feature">{getTranslation(lang, 'typeFeature')}</option>
                  <option value="release">{getTranslation(lang, 'typeRelease')}</option>
                  <option value="refactor">{getTranslation(lang, 'typeRefactor')}</option>
                  <option value="documentation">{getTranslation(lang, 'typeDocumentation')}</option>
                  <option value="prompt">{getTranslation(lang, 'typePrompt')}</option>
                </select>

              </div>

            </div>
          )}

          {/* DYNAMIC INNER CORE SHEET VIEW RESOLVER */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <ErrorBoundary>
              {selectedTask ? (
              <TaskDetailView />
            ) : currentView === 'dashboard' ? (
              <Dashboard />
            ) : currentView === 'notes' ? (
              <NotesView />
            ) : currentView === 'roadmap' ? (
              <RoadmapView />
            ) : currentView === 'prompts' ? (
              <PromptsView />
            ) : currentView === 'settings' ? (
              <SettingsView />
            ) : currentView === 'history' ? (
              <HistoryView />
            ) : currentView === 'archive' ? (
              <ArchiveView />
            ) : ['planned', 'pending', 'in_progress', 'testing', 'completed', 'cancelled'].includes(currentView) ? (
              
              /* FOCUSED WORKFLOW LIST VIEW */
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* Header details */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${
                        currentView === 'planned' ? 'bg-sky-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' :
                        currentView === 'pending' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                        currentView === 'in_progress' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse' :
                        currentView === 'testing' ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' :
                        currentView === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                      }`} />
                      <span>{getTranslation(lang, currentView as any)}</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider">
                      {filteredTasks.length} {getTranslation(lang, 'taskCount')} {getTranslation(lang, 'inThisList')}
                    </p>
                  </div>
                </div>

                {/* List items row table */}
                <div className="space-y-2 select-none">
                  {filteredTasks.map((t) => {
                    const proj = projects.find(pr => pr.id === t.projectId);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="group p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] shadow-sm hover:shadow transition-all flex items-center justify-between gap-4 cursor-pointer duration-300"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          
                          {/* Checked checkbox updates directly */}
                          <input
                            type="checkbox"
                            checked={t.status === 'completed'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              updateTask({
                                ...t,
                                status: e.target.checked ? 'completed' : 'in_progress'
                              }, `Toggled checklist status inline -> ${e.target.checked ? 'COMPLETED' : 'IN_PROGRESS'}`);
                            }}
                            className="w-4.5 h-4.5 rounded border-white/15 bg-black/45 text-emerald-400 focus:ring-opacity-0 cursor-pointer"
                          />

                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                              {t.title}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500">
                              
                              {/* Display associated project */}
                              {proj && (
                                <span className="flex items-center gap-1 font-semibold text-slate-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" style={{
                                    color: 
                                      proj.color === 'indigo' ? '#818cf8' :
                                      proj.color === 'emerald' ? '#34d399' :
                                      proj.color === 'sky' ? '#38bdf8' :
                                      proj.color === 'rose' ? '#fb7185' :
                                      proj.color === 'amber' ? '#fbbf24' :
                                      proj.color === 'purple' ? '#c084fc' : '#2dd4bf'
                                  }} />
                                  <span>{proj.name}</span>
                                </span>
                              )}

                              {/* Task Type badge */}
                              <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-slate-400 shrink-0 select-none">
                                {getTypeIcon(t.type)}
                                <span>{getTranslation(lang, `type${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` as any)}</span>
                              </span>

                              {/* Date updated */}
                              <span>Updated {new Date(t.updatedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Priority indicator */}
                        <div className="shrink-0 flex items-center gap-3.5">
                          
                          <div className={`p-1.5 rounded border ${getStatusColor(t.priority)}`} title="Priority">
                            {getPriorityIcon(t.priority)}
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
                      {getTranslation(lang, 'noTasksFound')}
                    </div>
                  )}
                </div>

              </div>

            ) : (
              /* STANDARD GENERAL TASKS VIEW (LIST OR KANBAN) */
              selectedProjectViewId && projectTab === 'git' ? (
                <GitHubProjectDashboard projectId={selectedProjectViewId} />
              ) : selectedProjectViewId ? (
                settings.projectViewMode === 'kanban' ? <KanbanBoard /> : <TaskListView />
              ) : (
                settings.taskViewMode === 'kanban' ? <KanbanBoard /> : <TaskListView />
              )
            )}
            </ErrorBoundary>
          </div>

        </div>
        </div>
      </div>

      {/* NEW TASK GLOWING CREATOR BOX */}
      <NewTaskModal />

      {/* COMMAND PALETTE */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />

      {/* STARTUP UPDATE POPUP MODAL */}
      {showUpdateModal && updateManifest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md p-6 rounded-2xl border border-indigo-500/25 glass-panel space-y-5 animate-scale-up">
            <div className="flex items-center gap-3 text-indigo-400">
              <Icons.Rocket className="w-8 h-8 shrink-0 animate-pulse" />
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{lang === 'ru' ? 'Доступно обновление' : lang === 'uk' ? 'Доступне оновлення' : 'New Update Available'}</h2>
                <h1 className="text-base font-bold text-white leading-tight">Flux Tasks v{updateManifest.version}</h1>
              </div>
            </div>

            {updateManifest.releaseNotes && updateManifest.releaseNotes.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl border border-white/5 bg-black/35">
                <div className="text-[9px] text-slate-500 font-bold uppercase">{lang === 'ru' ? 'Список изменений:' : lang === 'uk' ? 'Список змін:' : 'Release Notes:'}</div>
                <ul className="list-disc pl-4 text-[11px] text-slate-300 space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                  {updateManifest.releaseNotes.map((note: string, idx: number) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {installingUpdate ? (
              <div className="py-3 flex flex-col items-center justify-center gap-2">
                <Icons.Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="text-xs text-slate-400">{lang === 'ru' ? 'Установка обновления...' : lang === 'uk' ? 'Встановлення оновлення...' : 'Installing update...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                <button
                  onClick={() => {
                    localStorage.setItem(`skip_version_${updateManifest.version}`, 'true');
                    setShowUpdateModal(false);
                  }}
                  className="py-1.5 px-3.5 rounded-lg border border-white/5 hover:bg-rose-500/10 text-rose-400 cursor-pointer"
                >
                  {lang === 'ru' ? 'Пропустить версию' : lang === 'uk' ? 'Пропустити версію' : 'Skip Version'}
                </button>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="py-1.5 px-3.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer"
                >
                  {lang === 'ru' ? 'Позже' : lang === 'uk' ? 'Пізніше' : 'Later'}
                </button>
                <button
                  onClick={async () => {
                    setInstallingUpdate(true);
                    if (window.api) {
                      try {
                        const res = await window.api.downloadUpdate(updateManifest);
                        if (res.success && res.packagePath) {
                          const isAsarOnly = !!updateManifest.asarUrl;
                          await window.api.installUpdate(res.packagePath, isAsarOnly);
                        } else {
                          showToast(`${lang === 'ru' ? 'Ошибка загрузки обновления' : 'Download failed'}: ${res.error}`, 'error');
                          setInstallingUpdate(false);
                        }
                      } catch (err: any) {
                        showToast(`${lang === 'ru' ? 'Ошибка установки обновления' : 'Installation failed'}: ${err.message}`, 'error');
                        setInstallingUpdate(false);
                      }
                    }
                  }}
                  className="py-1.5 px-4 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 cursor-pointer active:scale-95 transition-all"
                >
                  {lang === 'ru' ? 'Установить сейчас' : lang === 'uk' ? 'Встановити зараз' : 'Install Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] p-4 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-fade-in max-w-sm select-none">
          {toast.type === 'error' && <Icons.AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
          {toast.type === 'success' && <Icons.CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
          {toast.type === 'info' && <Icons.Info className="w-5 h-5 text-sky-500 shrink-0" />}
          <div className="text-xs font-medium text-slate-200 pr-4 leading-normal">{toast.message}</div>
          <button
            onClick={hideToast}
            className="text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <WorkspaceApp />
    </StoreProvider>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Task, TaskStatus, TaskPriority, TaskType } from '../types';
import { StatusPortalDropdown } from './StatusPortalDropdown';

export const TaskListView: React.FC = () => {
  const {
    tasks,
    projects,
    settings,
    updateTask,
    setSelectedTask,
    setIsCreateModalOpen,
    filters,
    selectedProjectViewId,
    selectedTagViewName,
    updateSettings,
    projectTab,
    setProjectTab
  } = useStore();

  const lang = settings.language;
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [dropdownTriggerRect, setDropdownTriggerRect] = useState<DOMRect | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenStatusDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const isProjectView = selectedProjectViewId !== null;
  const currentMode = isProjectView ? (settings.projectViewMode || 'list') : (settings.taskViewMode || 'list');

  const setViewMode = (mode: 'list' | 'kanban') => {
    if (isProjectView) {
      updateSettings('projectViewMode', mode);
    } else {
      updateSettings('taskViewMode', mode);
    }
  };

  // Determine currently active project and dynamic theme colors
  const activeProjectId = filters.projectId !== 'all' ? filters.projectId : selectedProjectViewId;
  const activeProj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

  const getActiveProjectIconColor = (colorName?: string) => {
    switch (colorName) {
      case 'indigo': return 'text-indigo-400';
      case 'emerald': return 'text-emerald-400';
      case 'sky': return 'text-sky-400';
      case 'rose': return 'text-rose-400';
      case 'amber': return 'text-amber-400';
      case 'purple': return 'text-purple-400';
      case 'teal': return 'text-teal-400';
      default: return 'text-[#3bd2ff]';
    }
  };

  const getProjectColorHex = (colorName?: string) => {
    switch (colorName) {
      case 'indigo': return '#818cf8';
      case 'emerald': return '#34d399';
      case 'sky': return '#38bdf8';
      case 'rose': return '#fb7185';
      case 'amber': return '#fbbf24';
      case 'purple': return '#c084fc';
      case 'teal': return '#2dd4bf';
      default: return '#3bd2ff';
    }
  };

  const statusesList: { value: TaskStatus; labelKey: string; color: string; indicatorClass: string }[] = [
    { value: 'planned', labelKey: 'planned', color: 'text-blue-400 border-blue-500/20', indicatorClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' },
    { value: 'pending', labelKey: 'waiting', color: 'text-amber-400 border-amber-500/20', indicatorClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' },
    { value: 'in_progress', labelKey: 'inWork', color: 'text-orange-400 border-orange-500/20', indicatorClass: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse' },
    { value: 'testing', labelKey: 'testing', color: 'text-purple-400 border-purple-500/20', indicatorClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' },
    { value: 'completed', labelKey: 'completed', color: 'text-emerald-400 border-emerald-500/20', indicatorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]' },
    { value: 'cancelled', labelKey: 'cancelled', color: 'text-rose-400 border-rose-500/20', indicatorClass: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]' },
  ];

  const getStatusGlowColor = (st: TaskStatus) => {
    switch (st) {
      case 'planned': return 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]';
      case 'pending': return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
      case 'in_progress': return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse';
      case 'testing': return 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]';
      case 'completed': return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]';
      case 'cancelled': return 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]';
      default: return 'bg-slate-400';
    }
  };

  const getPriorityIcon = (prio: string) => {
    switch (prio) {
      case 'urgent': return <Icons.AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      case 'high': return <Icons.ChevronUp className="w-3.5 h-3.5 text-orange-400" />;
      case 'medium': return <Icons.Minus className="w-3.5 h-3.5 text-amber-400" />;
      case 'low': return <Icons.ChevronDown className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Icons.CircleDot className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getTypeGradient = (type: TaskType) => {
    switch (type) {
      case 'bug': return 'from-rose-400 to-orange-400';
      case 'feature': return 'from-blue-400 to-cyan-400';
      case 'release': return 'from-purple-400 to-pink-400';
      case 'refactor': return 'from-orange-400 to-amber-400';
      case 'documentation': return 'from-teal-400 to-cyan-400';
      case 'prompt': return 'from-pink-400 to-violet-400';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'bug': return <Icons.Bug className="w-3.5 h-3.5" />;
      case 'feature': return <Icons.Sparkles className="w-3.5 h-3.5" />;
      case 'release': return <Icons.Rocket className="w-3.5 h-3.5" />;
      case 'refactor': return <Icons.Wrench className="w-3.5 h-3.5" />;
      case 'documentation': return <Icons.FileText className="w-3.5 h-3.5" />;
      case 'prompt': return <Icons.Bot className="w-3.5 h-3.5" />;
      default: return <Icons.FileText className="w-3.5 h-3.5" />;
    }
  };

  const getPriorityBadge = (prio: TaskPriority) => {
    const label = getTranslation(lang, `priority${prio.charAt(0).toUpperCase() + prio.slice(1)}` as any);
    const displayLabel = prio === 'urgent' 
      ? (lang === 'ru' ? 'Критичный' : lang === 'uk' ? 'Критичний' : 'Critical') 
      : label;

    switch (prio) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400 font-semibold shrink-0">
            <span>⚠</span>
            <span>{displayLabel}</span>
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-400 font-semibold shrink-0">
            <span>↑</span>
            <span>{displayLabel}</span>
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400 font-semibold shrink-0">
            <span>●</span>
            <span>{displayLabel}</span>
          </span>
        );
      case 'low':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-sky-500/15 bg-sky-500/10 text-sky-400 font-semibold shrink-0">
            <span>↓</span>
            <span>{displayLabel}</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-slate-400 shrink-0">
            <span>{displayLabel}</span>
          </span>
        );
    }
  };

  const getChecklistSummary = (task: Task) => {
    const list = task.checklist || [];
    if (list.length === 0) return null;
    const completed = list.filter(item => item.done).length;
    return { completed, total: list.length, pct: Math.round((completed / list.length) * 100) };
  };

  const getPriorityWeight = (prio: TaskPriority) => {
    switch (prio) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const handleStatusChange = async (e: React.MouseEvent | null, task: Task, newStatus: TaskStatus) => {
    if (e) e.stopPropagation();
    setOpenStatusDropdownId(null);
    setDropdownTriggerRect(null);
    if (task.status === newStatus) return;

    const prevStatusLabel = getTranslation(lang, task.status === 'pending' ? 'waiting' : task.status === 'in_progress' ? 'inWork' : task.status as any);
    const newStatusLabel = getTranslation(lang, newStatus === 'pending' ? 'waiting' : newStatus === 'in_progress' ? 'inWork' : newStatus as any);

    await updateTask({
      ...task,
      status: newStatus
    }, `Status changed inline from ${prevStatusLabel} to ${newStatusLabel}`);
  };

  // Filter & sort tasks dynamically
  const activeTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      // Hide completed/cancelled tasks from regular lists
      if (t.status === 'completed' || t.status === 'cancelled') return false;

      // Filter by active project clicked in sidebar
      if (selectedProjectViewId) {
        if (t.projectId !== selectedProjectViewId) return false;
      }

      // Filter by tag clicked in sidebar
      if (selectedTagViewName) {
        if (!t.tags.includes(selectedTagViewName)) return false;
      }

      // Filter by top search bar query
      if (filters.search?.trim()) {
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
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const weightA = getPriorityWeight(a.priority);
        const weightB = getPriorityWeight(b.priority);
        if (weightA !== weightB) return weightB - weightA;
      }
      return new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime();
    });
  }, [tasks, filters, sortBy, selectedProjectViewId, selectedTagViewName]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full p-6 select-none">
      
      {/* Header Block */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.List className={`w-5 h-5 ${getActiveProjectIconColor(activeProj?.color)}`} />
            <span>
              {selectedProjectViewId 
                ? activeProj?.name 
                : selectedTagViewName 
                  ? `#${selectedTagViewName}`
                  : getTranslation(lang, 'tasksWorkspace')}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            {selectedProjectViewId 
              ? (activeProj?.description || (lang === 'ru' ? 'Задачи выбранного проекта' : lang === 'uk' ? 'Задачі обраного проекту' : 'Tasks of the selected project'))
              : (lang === 'ru' ? 'Общий список задач во всех проектах' : lang === 'uk' ? 'Загальний список задач у всіх проектах' : 'General list of tasks across all projects')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Project View / Git View switcher */}
          {selectedProjectViewId && (
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
              <button
                onClick={() => setProjectTab('tasks')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${projectTab === 'tasks' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
              >
                <Icons.CheckSquare className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Задачи' : lang === 'uk' ? 'Завдання' : 'Tasks'}</span>
              </button>
              <button
                onClick={() => setProjectTab('git')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${projectTab === 'git' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
              >
                <Icons.GitBranch className="w-3.5 h-3.5" />
                <span>Git / GitHub</span>
              </button>
            </div>
          )}

          {/* View Mode switcher */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${currentMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              <Icons.List className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Список' : lang === 'uk' ? 'Список' : 'List'}</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${currentMode === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              <Icons.LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Канбан' : lang === 'uk' ? 'Канбан' : 'Kanban'}</span>
            </button>
          </div>

          {/* Sorting picker */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer duration-200 ${sortBy === 'date' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {lang === 'ru' ? 'По дате' : lang === 'uk' ? 'За датою' : 'By Date'}
            </button>
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer duration-200 ${sortBy === 'priority' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {lang === 'ru' ? 'Приоритет' : lang === 'uk' ? 'Пріоритет' : 'By Priority'}
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true, 'feature', 'planned')}
            className={`px-4 py-1.5 bg-gradient-to-r from-[#007dff] to-[#ff52df] hover:scale-[1.02] rounded-lg text-xs font-semibold text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer duration-200`}
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'newTask')}</span>
          </button>
        </div>
      </div>

      {/* Content Sheet */}
      {activeTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-scale-up">
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <div className="p-4 rounded-full bg-white/[0.04] border border-white/10 text-[#3bd2ff]">
              <Icons.Inbox className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'ru' ? 'Задач пока нет' : lang === 'uk' ? 'Задач поки немає' : 'No Tasks Yet'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ru' ? 'Создайте первую задачу, чтобы начать работу' : lang === 'uk' ? 'Створіть першу задачу, щоб почати роботу' : 'Create your first task to get started'}
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true, 'feature', 'planned')}
              className="px-4 py-2 bg-gradient-to-r from-[#007dff] to-[#ff52df] text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {lang === 'ru' ? 'Новая задача' : lang === 'uk' ? 'Нова задача' : 'New Task'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin select-none">
          {activeTasks.map((t) => {
            const proj = projects.find(p => p.id === t.projectId);
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className="bg-white/[0.015] border border-white/5 hover:border-white/10 bg-white/[0.03] hover:bg-white/[0.04] p-4.5 rounded-2xl flex flex-col gap-3 cursor-pointer shadow-sm hover:shadow transition-all duration-300 group"
              >
                {/* Row 1: Title */}
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-[#3bd2ff] transition-colors truncate">
                    {t.title}
                  </h3>
                </div>

                {/* Row 2: Description preview */}
                {t.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-4xl">
                    {t.description.replace(/[#*`[\]]/g, '')}
                  </p>
                )}

                {/* Row 3: Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {/* Project badge */}
                  {proj && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProjectColorHex(proj.color) }} />
                      <span>{proj.name}</span>
                    </span>
                  )}

                  {/* Task type badge */}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/5 bg-gradient-to-r ${getTypeGradient(t.type)} bg-clip-text text-transparent font-bold shrink-0`}>
                    <span className="text-slate-300 shrink-0">{getTypeIcon(t.type)}</span>
                    <span className="text-slate-300 font-semibold">{getTranslation(lang, `type${t.type.charAt(0).toUpperCase() + t.type.slice(1)}` as any)}</span>
                  </span>

                  {/* Priority badge */}
                  {getPriorityBadge(t.priority)}

                  {/* Tags */}
                  {t.tags && t.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.03] text-[9px] font-semibold text-slate-400 border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 4: Metrics line + Status Dropdown */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1" onClick={(e) => e.stopPropagation()}>
                  {/* Metrics details */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 select-none">
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Вложения' : 'Attachments'}>
                      <span>📎</span>
                      <span className="font-mono font-bold text-slate-300">{t.attachments?.length || 0}</span>
                    </span>
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Промпты / Заметки' : 'Prompts & Notes'}>
                      <span>💬</span>
                      <span className="font-mono font-bold text-slate-300">{(t.prompts?.length || 0) + (t.notes?.trim() ? 1 : 0)}</span>
                    </span>
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Чек-лист' : 'Checklist'}>
                      <span>✓</span>
                      <span className="font-mono font-bold text-slate-300">
                        {(() => {
                          const total = t.checklist?.length || 0;
                          const completed = t.checklist?.filter(item => item.done).length || 0;
                          return total > 0 ? `${completed}/${total}` : '0';
                        })()}
                      </span>
                    </span>
                  </div>

                  {/* Status Dropdown & Date */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openStatusDropdownId === t.id) {
                            setOpenStatusDropdownId(null);
                            setDropdownTriggerRect(null);
                          } else {
                            setOpenStatusDropdownId(t.id);
                            setDropdownTriggerRect(e.currentTarget.getBoundingClientRect());
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-slate-300 transition-all duration-200 cursor-pointer min-w-[125px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusGlowColor(t.status)}`} />
                          <span>{getTranslation(lang, t.status === 'pending' ? 'waiting' : t.status === 'in_progress' ? 'inWork' : t.status as any)}</span>
                        </div>
                        <Icons.ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>

                      {openStatusDropdownId === t.id && dropdownTriggerRect && (
                        <StatusPortalDropdown
                          isOpen={true}
                          onClose={() => { setOpenStatusDropdownId(null); setDropdownTriggerRect(null); }}
                          currentStatus={t.status}
                          onSelect={(newStatus) => handleStatusChange(null, t, newStatus)}
                          triggerRect={dropdownTriggerRect}
                          lang={lang}
                        />
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium select-none shrink-0">
                      <Icons.CalendarDays className="w-3 h-3 text-slate-600" />
                      <span>{lang === 'ru' ? 'Обновлено' : lang === 'uk' ? 'Оновлено' : 'Updated'} {new Date(t.updatedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

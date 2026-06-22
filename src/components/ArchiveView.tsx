import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Task, TaskStatus, TaskPriority, TaskType } from '../types';
import { StatusPortalDropdown } from './StatusPortalDropdown';

export const ArchiveView: React.FC = () => {
  const {
    tasks,
    projects,
    settings,
    updateTask,
    setSelectedTask
  } = useStore();

  const lang = settings.language;
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [dropdownTriggerRect, setDropdownTriggerRect] = useState<DOMRect | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenStatusDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

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

  // Filter and sort archived tasks
  const archivedTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      // Archive view only shows completed and cancelled tasks
      const isArchived = t.status === 'completed' || t.status === 'cancelled';
      if (!isArchived) return false;

      // Status filter (completed vs cancelled)
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Project filter
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesTags = (t.tags || []).some(tg => tg.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

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
  }, [tasks, statusFilter, selectedProjectId, searchQuery, sortBy]);

  // Local translations helper
  const t = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      ru: {
        archiveTitle: 'Архив задач',
        archiveDesc: 'Список выполненных и отмененных задач',
        searchPlaceholder: 'Поиск в архиве...',
        filterAll: 'Все',
        filterCompleted: 'Выполнено',
        filterCancelled: 'Отменено',
        filterProject: 'Все проекты',
        noTasks: 'В архиве пока нет задач',
        restoreBtn: 'Вернуть',
        sortByDate: 'По дате',
        sortByPriority: 'Приоритет',
        updatedLabel: 'Обновлено'
      },
      uk: {
        archiveTitle: 'Архів задач',
        archiveDesc: 'Список виконаних та скасованих задач',
        searchPlaceholder: 'Пошук в архіві...',
        filterAll: 'Все',
        filterCompleted: 'Виконано',
        filterCancelled: 'Скасовано',
        filterProject: 'Всі проекти',
        noTasks: 'В архіві поки немає задач',
        restoreBtn: 'Повернути',
        sortByDate: 'За датою',
        sortByPriority: 'Пріоритет',
        updatedLabel: 'Оновлено'
      },
      en: {
        archiveTitle: 'Task Archive',
        archiveDesc: 'List of completed and cancelled tasks',
        searchPlaceholder: 'Search archive...',
        filterAll: 'All',
        filterCompleted: 'Completed',
        filterCancelled: 'Cancelled',
        filterProject: 'All Projects',
        noTasks: 'No tasks in archive yet',
        restoreBtn: 'Restore',
        sortByDate: 'By Date',
        sortByPriority: 'Priority',
        updatedLabel: 'Updated'
      }
    };
    return (dict[lang] || dict['en'])[key];
  };

  const statusesList: { value: TaskStatus; labelKey: string; indicatorClass: string }[] = [
    { value: 'planned', labelKey: 'planned', indicatorClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' },
    { value: 'pending', labelKey: 'waiting', indicatorClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' },
    { value: 'in_progress', labelKey: 'inWork', indicatorClass: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse' },
    { value: 'testing', labelKey: 'testing', indicatorClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' },
    { value: 'completed', labelKey: 'completed', indicatorClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]' },
    { value: 'cancelled', labelKey: 'cancelled', indicatorClass: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full p-6 select-none">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 drop-shadow-[0_0_6px_rgba(255,90,217,0.4)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 8V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8Z" stroke="url(#archiveGradHeader)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 3H2V7H22V3Z" fill="url(#archiveGradHeader)" />
              <path d="M10 12H14" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
              <defs>
                <linearGradient id="archiveGradHeader" x1="2" y1="3" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff5ad9" />
                  <stop offset="100%" stopColor="#8c5bff" />
                </linearGradient>
              </defs>
            </svg>
            <span>{t('archiveTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t('archiveDesc')}
          </p>
        </div>

        {/* View Controls & Sorting */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sorting picker */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer duration-200 ${sortBy === 'date' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {t('sortByDate')}
            </button>
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer duration-200 ${sortBy === 'priority' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {t('sortByPriority')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Search + Dropdowns + Status Tabs) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.01] mb-5 shrink-0">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t('filterAll')}
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
          >
            {t('filterCompleted')}
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${statusFilter === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/10' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
          >
            {t('filterCancelled')}
          </button>
        </div>

        {/* Search and Project Filter */}
        <div className="flex items-center gap-3 flex-1 md:justify-end">
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full py-1.5 pl-9 pr-8 rounded-xl border border-white/5 bg-slate-900/45 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
            />
            {searchQuery && (
              <Icons.X 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 hover:text-white cursor-pointer"
              />
            )}
          </div>

          {/* Project dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-white/5 bg-slate-900/40 text-xs text-slate-300 font-semibold focus:outline-none"
          >
            <option value="all">{t('filterProject')}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid List */}
      {archivedTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-scale-up">
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl shadow-2xl flex flex-col items-center max-w-sm text-center space-y-4">
            <div className="p-4 rounded-full bg-white/[0.04] border border-white/10 text-rose-400">
              <svg className="w-10 h-10 shrink-0 drop-shadow-[0_0_12px_rgba(255,90,217,0.45)] animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8Z" stroke="url(#archiveGradEmpty)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 3H2V7H22V3Z" fill="url(#archiveGradEmpty)" />
                <path d="M10 12H14" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                <defs>
                  <linearGradient id="archiveGradEmpty" x1="2" y1="3" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ff5ad9" />
                    <stop offset="100%" stopColor="#8c5bff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t('noTasks')}
              </h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin select-none performance-list">
          {archivedTasks.map((task) => {
            const proj = projects.find(p => p.id === task.projectId);
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="bg-white/[0.015] border border-white/5 hover:border-white/10 bg-white/[0.03] hover:bg-white/[0.04] p-4.5 rounded-2xl flex flex-col gap-3 cursor-pointer shadow-sm hover:shadow transition-all duration-300 group relative overflow-hidden"
              >
                {/* Visual indicator of archived status at the side */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                {/* Title */}
                <div className="flex items-start justify-between gap-3 min-w-0 pl-1.5">
                  <h3 className="text-sm font-semibold text-slate-300 group-hover:text-rose-400 transition-colors truncate">
                    {task.title}
                  </h3>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-4xl pl-1.5">
                    {task.description.replace(/[#*`[\]]/g, '')}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] pl-1.5">
                  {/* Project */}
                  {proj && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProjectColorHex(proj.color) }} />
                      <span>{proj.name}</span>
                    </span>
                  )}

                  {/* Task Type */}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border border-white/5 bg-gradient-to-r ${getTypeGradient(task.type)} bg-clip-text text-transparent font-bold shrink-0`}>
                    <span className="text-slate-300 shrink-0">{getTypeIcon(task.type)}</span>
                    <span className="text-slate-300 font-semibold">{getTranslation(lang, `type${task.type.charAt(0).toUpperCase() + task.type.slice(1)}` as any)}</span>
                  </span>

                  {/* Priority */}
                  {getPriorityBadge(task.priority)}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.03] text-[9px] font-semibold text-slate-400 border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metrics + Action drop */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 pl-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 select-none">
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Вложения' : 'Attachments'}>
                      <span>📎</span>
                      <span className="font-mono font-bold text-slate-300">{task.attachments?.length || 0}</span>
                    </span>
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Промпты / Заметки' : 'Prompts & Notes'}>
                      <span>💬</span>
                      <span className="font-mono font-bold text-slate-300">{(task.prompts?.length || 0) + (task.notes?.trim() ? 1 : 0)}</span>
                    </span>
                    <span className="flex items-center gap-1" title={lang === 'ru' ? 'Чек-лист' : 'Checklist'}>
                      <span>✓</span>
                      <span className="font-mono font-bold text-slate-300">
                        {(() => {
                          const total = task.checklist?.length || 0;
                          const completed = task.checklist?.filter(item => item.done).length || 0;
                          return total > 0 ? `${completed}/${total}` : '0';
                        })()}
                      </span>
                    </span>
                  </div>

                  {/* Action dropdown or Date */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openStatusDropdownId === task.id) {
                            setOpenStatusDropdownId(null);
                            setDropdownTriggerRect(null);
                          } else {
                            setOpenStatusDropdownId(task.id);
                            setDropdownTriggerRect(e.currentTarget.getBoundingClientRect());
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-semibold text-slate-300 transition-all duration-200 cursor-pointer min-w-[135px] justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusGlowColor(task.status)}`} />
                          <span>{getTranslation(lang, task.status === 'pending' ? 'waiting' : task.status === 'in_progress' ? 'inWork' : task.status as any)}</span>
                        </div>
                        <Icons.ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>

                      {openStatusDropdownId === task.id && dropdownTriggerRect && (
                        <StatusPortalDropdown
                          isOpen={true}
                          onClose={() => { setOpenStatusDropdownId(null); setDropdownTriggerRect(null); }}
                          currentStatus={task.status}
                          onSelect={(newStatus) => handleStatusChange(null, task, newStatus)}
                          triggerRect={dropdownTriggerRect}
                          lang={lang}
                        />
                      )}
                    </div>

                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium select-none shrink-0">
                      <Icons.CalendarDays className="w-3 h-3 text-slate-600" />
                      <span>{t('updatedLabel')} {new Date(task.updatedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
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

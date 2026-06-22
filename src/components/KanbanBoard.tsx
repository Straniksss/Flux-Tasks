import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Task, TaskStatus, TaskPriority, TaskType } from '../types';

export const KanbanBoard: React.FC = () => {
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
    updateSettings
  } = useStore();

  const lang = settings.language;
  const isProjectView = selectedProjectViewId !== null;
  const currentMode = isProjectView ? (settings.projectViewMode || 'list') : (settings.taskViewMode || 'list');

  const setViewMode = (mode: 'list' | 'kanban') => {
    if (isProjectView) {
      updateSettings('projectViewMode', mode);
    } else {
      updateSettings('taskViewMode', mode);
    }
  };
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');

  // Determine currently active project and dynamic theme colors
  const activeProjectId = filters.projectId !== 'all' ? filters.projectId : selectedProjectViewId;
  const activeProj = activeProjectId ? projects.find(p => p.id === activeProjectId) : null;

  const getProjectButtonGradient = (colorName?: string) => {
    switch (colorName) {
      case 'indigo': return 'from-indigo-500 via-indigo-600 to-violet-600 shadow-indigo-500/20 hover:shadow-indigo-500/30';
      case 'emerald': return 'from-emerald-500 via-teal-500 to-teal-600 shadow-emerald-500/20 hover:shadow-emerald-500/30';
      case 'sky': return 'from-sky-500 via-blue-500 to-blue-600 shadow-sky-500/20 hover:shadow-sky-500/30';
      case 'rose': return 'from-rose-500 via-pink-500 to-rose-600 shadow-rose-500/20 hover:shadow-rose-500/30';
      case 'amber': return 'from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/20 hover:shadow-amber-500/30';
      case 'purple': return 'from-purple-500 via-fuchsia-500 to-purple-600 shadow-purple-500/20 hover:shadow-purple-500/30';
      case 'teal': return 'from-teal-500 via-emerald-500 to-teal-600 shadow-teal-500/20 hover:shadow-teal-500/30';
      default: return 'from-[#007dff] via-[#cd1cee] to-[#ff52df] shadow-[#007dff]/20 hover:shadow-[#ff52df]/30'; // Default brand premium Flux gradient
    }
  };

  const getActiveProjectIconColor = (colorName?: string) => {
    switch (colorName) {
      case 'indigo': return 'text-indigo-400';
      case 'emerald': return 'text-emerald-400';
      case 'sky': return 'text-sky-400';
      case 'rose': return 'text-rose-400';
      case 'amber': return 'text-amber-400';
      case 'purple': return 'text-purple-400';
      case 'teal': return 'text-teal-400';
      default: return 'text-[#3bd2ff]'; // Default brand cyber cyan
    }
  };

  const statusesList: { value: TaskStatus; labelKey: string; emoji: string; color: string; indicatorClass: string; icon: any }[] = [
    { value: 'planned', labelKey: 'planned', emoji: '📌', color: 'text-blue-400 border-blue-500/20', indicatorClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]', icon: Icons.Calendar },
    { value: 'pending', labelKey: 'waiting', emoji: '⏳', color: 'text-amber-400 border-amber-500/20', indicatorClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]', icon: Icons.Clock },
    { value: 'in_progress', labelKey: 'inWork', emoji: '🚧', color: 'text-orange-400 border-orange-500/20', indicatorClass: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] animate-pulse', icon: Icons.Flame },
    { value: 'testing', labelKey: 'testing', emoji: '🧪', color: 'text-purple-400 border-purple-500/20', indicatorClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]', icon: Icons.Terminal },
  ];

  const getProjectDetails = (projId: string) => {
    return projects.find(p => p.id === projId);
  };

  const getTypeGradients = (type: TaskType) => {
    switch (type) {
      case 'bug': return 'from-rose-500 to-orange-500';
      case 'feature': return 'from-blue-500 to-cyan-400';
      case 'release': return 'from-purple-600 to-pink-500';
      case 'refactor': return 'from-orange-500 to-amber-500';
      case 'documentation': return 'from-teal-500 to-cyan-400';
      case 'prompt': return 'from-pink-500 to-violet-600';
      default: return 'from-slate-400 to-slate-600';
    }
  };

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

  const getPriorityBadgeColor = (prio: TaskPriority) => {
    switch (prio) {
      case 'urgent': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
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

  // Filter & sort tasks dynamically (memoized for performance)
  const activeTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      // Hide completed/cancelled tasks from regular lists
      if (t.status === 'completed' || t.status === 'cancelled') return false;

      // Filter by global search query
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
      if (filters.tag !== 'all' && !t.tags.includes(filters.tag)) return false;

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
  }, [tasks, filters, sortBy]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropTask = async (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;

    const prevStatusLabel = getTranslation(lang, task.status === 'pending' ? 'waiting' : task.status === 'in_progress' ? 'inWork' : task.status as any);
    const newStatusLabel = getTranslation(lang, targetStatus === 'pending' ? 'waiting' : targetStatus === 'in_progress' ? 'inWork' : targetStatus as any);

    await updateTask({
      ...task,
      status: targetStatus
    }, `Status drag-dropped from ${prevStatusLabel} to ${newStatusLabel}`);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full p-6 select-none">
      {openDropdownId && (
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdownId(null);
          }}
        />
      )}
      
      {/* Header Block */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.LayoutGrid className={`w-5 h-5 ${getActiveProjectIconColor(activeProj?.color)}`} />
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
              : getTranslation(lang, 'kanbanDesc')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode switcher */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 hover:text-slate-200`}
            >
              <Icons.List className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Список' : lang === 'uk' ? 'Список' : 'List'}</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 bg-white/10 text-white shadow-sm`}
            >
              <Icons.LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Канбан' : lang === 'uk' ? 'Канбан' : 'Kanban'}</span>
            </button>
          </div>

          {/* Sorting picker */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
            <button
              onClick={() => setSortBy('date')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${sortBy === 'date' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {lang === 'ru' ? 'По дате' : lang === 'uk' ? 'За датою' : 'By Date'}
            </button>
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${sortBy === 'priority' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'}`}
            >
              {lang === 'ru' ? 'Приоритет' : lang === 'uk' ? 'Пріоритет' : 'By Priority'}
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true, 'feature', 'planned')}
            className={`px-4 py-1.5 btn-primary hover:scale-[1.02] rounded-lg text-xs font-semibold text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer duration-200`}
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'newTask')}</span>
          </button>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 overflow-x-auto flex gap-4 pb-4 items-start custom-scrollbar">
        {statusesList.map((st) => {
          const colTasks = activeTasks.filter(t => t.status === st.value);
          const isDragOver = dragOverStatus === st.value;
          
          return (
            <div
              key={st.value}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStatus !== st.value) setDragOverStatus(st.value);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => {
                setDragOverStatus(null);
                const taskId = e.dataTransfer.getData('text/plain');
                handleDropTask(taskId, st.value);
              }}
              className={`w-[300px] shrink-0 max-h-[70vh] rounded-2xl border flex flex-col transition-all duration-300 ${
                isDragOver 
                  ? 'glass-panel border-flux-azure/50 bg-white/[0.08] shadow-[0_0_20px_rgba(63,140,255,0.15)]' 
                  : 'glass-panel border-white/5 shadow-inner'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{st.emoji}</span>
                  <span className="text-xs font-bold text-slate-200 truncate uppercase tracking-wider">
                    {getTranslation(lang, st.labelKey as any)}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List Column Scroll */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar min-h-[150px] performance-list">
                {colTasks.map((task) => {
                  const proj = getProjectDetails(task.projectId);
                  const chk = getChecklistSummary(task);
                  const typeGrad = getTypeGradients(task.type);

                  const colorMap: any = {
                    indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
                    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
                    sky: 'border-sky-500/20 text-sky-400 bg-sky-500/5',
                    rose: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
                    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
                    purple: 'border-purple-500/20 text-purple-400 bg-purple-500/5',
                    teal: 'border-teal-500/20 text-teal-400 bg-teal-500/5'
                  };

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTask(task)}
                      className="group relative p-4 rounded-xl glass-panel glass-panel-hover cursor-grab active:cursor-grabbing flex flex-col justify-between"
                    >
                      {/* Color strip top */}
                      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${typeGrad}`} />

                      <div className="space-y-2">
                        {/* Header: Title & Type Icon */}
                        <div className="flex items-start justify-between gap-2.5 pt-1">
                          <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white transition-colors leading-snug truncate flex-1">
                            {task.title}
                          </h4>
                          <div className={`shrink-0 p-1 rounded-md bg-gradient-to-tr ${typeGrad} text-slate-900 shadow-md transform group-hover:scale-105 transition-transform`}>
                            {getTypeIcon(task.type)}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed font-sans">
                            {task.description}
                          </p>
                        )}

                        {/* Project Badge */}
                        {proj && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${colorMap[proj.color] || 'border-slate-800 text-slate-400'}`}>
                              <span className="w-1 h-1 rounded-full bg-current" />
                              <span>{proj.name}</span>
                            </div>
                          </div>
                        )}

                        {/* Checklist progress bar */}
                        {chk && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                              <span>Checklist</span>
                              <span>{chk.completed}/{chk.total} ({chk.pct}%)</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full accent-bg rounded-full transition-all" style={{ width: `${chk.pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-1 text-[10px]">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border font-mono ${getPriorityBadgeColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          <span className="capitalize">{getTranslation(lang, `priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as any)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500">
                          {task.prompts && task.prompts.length > 0 && (
                            <div className="flex items-center gap-0.5" title="AI Prompts attached">
                              <Icons.Bot className="w-3 h-3 text-rose-400" />
                              <span className="text-[9px] font-mono font-bold text-slate-400">{task.prompts.length}</span>
                            </div>
                          )}
                          {task.codeSnippets && task.codeSnippets.length > 0 && (
                            <div className="flex items-center gap-0.5" title="Code snippets attached">
                              <Icons.Code2 className="w-3 h-3 text-teal-400" />
                              <span className="text-[9px] font-mono font-bold text-slate-400">{task.codeSnippets.length}</span>
                            </div>
                          )}
                          {task.attachments && task.attachments.length > 0 && (
                            <Icons.Paperclip className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.005] flex flex-col items-center justify-center">
                    <Icons.Inbox className="w-5 h-5 text-slate-700 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">Empty Column</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

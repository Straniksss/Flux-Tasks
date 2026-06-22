import React, { useMemo } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { Task, Project, Release } from '../types';

const EmptyIllustration: React.FC = () => (
  <svg viewBox="0 0 200 150" fill="none" className="w-40 h-32 mx-auto text-slate-600 opacity-60">
    <rect x="30" y="20" width="140" height="90" rx="20" fill="url(#glassGrad)" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" />
    <circle cx="55" cy="50" r="8" fill="#3f8cff" fillOpacity="0.2" />
    <path d="M 52,50 L 54,52 L 58,48" stroke="#3f8cff" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="75" y="46" width="70" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
    
    <circle cx="55" cy="75" r="8" fill="#a855f7" fillOpacity="0.2" />
    <path d="M 52,75 L 54,77 L 58,73" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="75" y="71" width="50" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
    
    <circle cx="160" cy="40" r="14" fill="url(#blobGrad)" filter="blur(6px)" opacity="0.3" />
    
    <defs>
      <linearGradient id="glassGrad" x1="30" y1="20" x2="170" y2="110">
        <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.002)" />
      </linearGradient>
      <linearGradient id="blobGrad" x1="146" y1="26" x2="174" y2="54">
        <stop offset="0%" stopColor="#12b8ff" />
        <stop offset="100%" stopColor="#ff5ad9" />
      </linearGradient>
    </defs>
  </svg>
);

export const Dashboard: React.FC = () => {
  const {
    tasks,
    projects,
    releases,
    settings,
    setCurrentView,
    setSelectedTask,
    setSelectedProjectViewId,
    setSelectedTagViewName,
    setIsCreateModalOpen,
    activityLogs,
    isLoading
  } = useStore();

  const lang = settings.language;

  // Safe arrays to prevent Uncaught TypeErrors on undefined/empty databases
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeReleases = Array.isArray(releases) ? releases : [];
  const safeActivityLogs = Array.isArray(activityLogs) ? activityLogs : [];

  // Custom greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) {
      return lang === 'ru' ? 'Доброй ночи' : lang === 'uk' ? 'Доброї ночі' : 'Good night';
    } else if (hour < 12) {
      return lang === 'ru' ? 'Доброе утро' : lang === 'uk' ? 'Доброго ранку' : 'Good morning';
    } else if (hour < 18) {
      return lang === 'ru' ? 'Добрый день' : lang === 'uk' ? 'Доброго дня' : 'Good afternoon';
    } else {
      return lang === 'ru' ? 'Добрый вечер' : lang === 'uk' ? 'Доброго вечора' : 'Good evening';
    }
  };

  const stats = useMemo(() => {
    const total = safeTasks.length;
    const active = safeTasks.filter(t => t.status === 'in_progress' || t.status === 'testing').length;
    const completed = safeTasks.filter(t => t.status === 'completed').length;
    const pending = safeTasks.filter(t => t.status === 'pending' || t.status === 'planned').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Upcoming releases sorted by date
    const upcoming = safeReleases
      .filter(r => r.status === 'planned')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    // Limit active/focus tasks for dashboard view (max 4)
    const focusTasks = safeTasks
      .filter(t => t.status === 'in_progress' || t.status === 'pending')
      .slice(0, 4);

    const recent: any[] = [];
    for (const h of safeActivityLogs) {
      if (recent.length >= 4) break;
      const t = safeTasks.find(x => x.id === h.taskId);
      if (t) {
        recent.push({
          task: t,
          action: h.action,
          timestamp: h.timestamp,
          details: h.details
        });
      }
    }

    return {
      total,
      active,
      completed,
      pending,
      pct,
      upcoming,
      focusTasks,
      recent
    };
  }, [tasks, releases, activityLogs]);

  const { 
    total: totalTasks = 0, 
    active: activeTasks = 0, 
    completed: completedTasks = 0, 
    pending: pendingTasks = 0, 
    pct: completionPercentage = 0, 
    upcoming: upcomingReleases = [], 
    focusTasks = [], 
    recent: recentActivities = [] 
  } = stats || {};

  const getRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const min = Math.floor(ms / 60000);
      const hours = Math.floor(min / 60);
      if (min < 1) return getTranslation(lang, 'justNow');
      if (min < 60) return `${min} ${getTranslation(lang, 'minutesAgo')}`;
      if (hours < 24) return `${hours} ${getTranslation(lang, 'hoursAgo')}`;
      return new Date(isoString).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uk' ? 'uk-UA' : 'en-US', {
        month: 'short', day: 'numeric'
      });
    } catch {
      return getTranslation(lang, 'justNow');
    }
  };

  const getPriorityStyle = (prio: string) => {
    switch (prio) {
      case 'urgent': return { icon: <Icons.AlertOctagon className="w-3.5 h-3.5" />, text: lang === 'ru' ? 'Срочный' : lang === 'uk' ? 'Терміновий' : 'Urgent', color: 'text-rose-400' };
      case 'high': return { icon: <Icons.ChevronUp className="w-3.5 h-3.5" />, text: lang === 'ru' ? 'Высокий' : lang === 'uk' ? 'Високий' : 'High', color: 'text-orange-400' };
      case 'medium': return { icon: <Icons.Minus className="w-3.5 h-3.5" />, text: lang === 'ru' ? 'Средний' : lang === 'uk' ? 'Середній' : 'Medium', color: 'text-amber-400' };
      default: return { icon: <Icons.ChevronDown className="w-3.5 h-3.5" />, text: lang === 'ru' ? 'Низкий' : lang === 'uk' ? 'Низький' : 'Low', color: 'text-sky-400' };
    }
  };

  const colorMap: any = {
    indigo: '#818cf8',
    emerald: '#34d399',
    sky: '#38bdf8',
    rose: '#fb7185',
    amber: '#fbbf24',
    purple: '#c084fc',
    teal: '#2dd4bf'
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-8 select-none animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-white/5 rounded-lg" />
            <div className="h-4 w-40 bg-white/5 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-white/5 rounded-lg" />
            <div className="h-9 w-10 bg-white/5 rounded-lg" />
            <div className="h-9 w-10 bg-white/5 rounded-lg" />
          </div>
        </div>

        {/* Main Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Hero card skeleton */}
            <div className="h-32 bg-white/5 rounded-2xl border border-white/[0.02]" />
            {/* Projects gallery skeleton */}
            <div className="space-y-4">
              <div className="h-4 w-32 bg-white/5 rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-32 bg-white/5 rounded-2xl border border-white/[0.02]" />
                <div className="h-32 bg-white/5 rounded-2xl border border-white/[0.02]" />
              </div>
            </div>
            {/* Focus tasks skeleton */}
            <div className="space-y-4">
              <div className="h-4 w-32 bg-white/5 rounded-md" />
              <div className="space-y-2">
                <div className="h-14 bg-white/5 rounded-2xl border border-white/[0.02]" />
                <div className="h-14 bg-white/5 rounded-2xl border border-white/[0.02]" />
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="h-48 bg-white/5 rounded-2xl border border-white/[0.02]" />
            <div className="h-48 bg-white/5 rounded-2xl border border-white/[0.02]" />
            <div className="h-28 bg-white/5 rounded-2xl border border-white/[0.02]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 select-none scrollbar-none">
      
      {/* Header section with Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-medium text-white tracking-tight">
            {getGreeting()}, <span className="text-gradient">developer</span>
          </h2>
          <p className="text-xs text-slate-400/80 font-medium">
            {new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uk' ? 'uk-UA' : 'en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCreateModalOpen(true, 'feature', 'planned')}
            className="btn-primary py-2 px-4 flex items-center gap-2 text-xs font-semibold"
          >
            <Icons.Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{getTranslation(lang, 'newTask')}</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('notes')}
            className="btn-secondary py-2 px-3.5 flex items-center gap-2 text-xs"
            title={getTranslation(lang, 'notes')}
          >
            <Icons.StickyNote className="w-4 h-4 accent-text" />
          </button>

          <button 
            onClick={() => setCurrentView('settings')}
            className="btn-secondary py-2 px-3.5 flex items-center gap-2 text-xs"
            title={getTranslation(lang, 'settings')}
          >
            <Icons.Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Workspace (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* PRIMARY HERO CARD - Overall Completion Metric */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-500/8 via-[#ff5ad9]/3 to-transparent border border-white/[0.03] shadow-xl overflow-hidden group">
            {/* Soft decorative background glows */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#ff5ad9]/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold accent-text uppercase tracking-widest">{getTranslation(lang, 'progressTrend')}</span>
                <h3 className="text-xl font-display font-medium text-white tracking-tight">
                  {lang === 'ru' ? 'Прогресс текущего спринта' : lang === 'uk' ? 'Прогрес поточного спринту' : 'Current Sprint Progress'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {lang === 'ru'
                    ? `Вы выполнили ${completedTasks} задач из общего количества ${totalTasks}. Продолжайте в том же духе! 🚀`
                    : lang === 'uk'
                    ? `Ви виконали ${completedTasks} завдань із загальної кількості ${totalTasks}. Продовжуйте так само! 🚀`
                    : `You have completed ${completedTasks} tasks out of a total of ${totalTasks}. Keep it going! 🚀`}
                </p>
              </div>

              {/* Visual Radial/Slider gauge */}
              <div className="flex flex-col items-center justify-center min-w-[140px] text-center">
                <span className="text-4xl font-display font-semibold text-white tracking-tight">{completionPercentage}%</span>
                <span className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wider">{getTranslation(lang, 'closureRate')}</span>
                <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${completionPercentage}%`,
                      backgroundImage: `linear-gradient(to right, ${settings.gradientStart}, ${settings.gradientEnd})`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE PROJECTS GALLERY */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-400">{getTranslation(lang, 'projects')}</h3>
            </div>

            {(safeProjects ?? []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(safeProjects ?? []).slice(0, 4).map(p => {
                  const projTasks = safeTasks.filter(t => t.projectId === p.id);
                  const projTasksCount = projTasks.length;
                  const projCompleted = projTasks.filter(t => t.status === 'completed').length;
                  const projCompletePercent = projTasksCount > 0 ? Math.round((projCompleted / projTasksCount) * 100) : 0;
                  const hexColor = colorMap[p.color] || '#cbd5e1';

                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectViewId(p.id);
                        setSelectedTagViewName(null);
                        setCurrentView('all_tasks');
                      }}
                      className="glass-card glass-card-hover p-4 flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl group-hover:scale-125 transition-transform opacity-30" style={{ backgroundColor: hexColor }} />
                      
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="shrink-0" style={{ color: hexColor }}>
                            {(() => {
                              const LucideIcon = (Icons as any)[p.icon];
                              if (LucideIcon) return <LucideIcon className="w-5 h-5" />;
                              return <Icons.Folder className="w-5 h-5 text-slate-400" />;
                            })()}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span>{projCompleted} / {projTasksCount} {getTranslation(lang, 'taskPlural')}</span>
                          <span className="font-semibold text-white">{projCompletePercent}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${projCompletePercent}%`, backgroundColor: hexColor }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-6 text-center space-y-2">
                <EmptyIllustration />
                <p className="text-xs text-slate-500 font-medium">{getTranslation(lang, 'noProjectsFound')}</p>
              </div>
            )}
          </div>

          {/* ACTIONABLE FOCUS TASKS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-400">
              {lang === 'ru' ? 'В фокусе' : lang === 'uk' ? 'У фокусі' : 'In Focus'}
            </h3>

            {(focusTasks ?? []).length > 0 ? (
              <div className="space-y-2">
                {(focusTasks ?? []).map(t => {
                  const prioInfo = getPriorityStyle(t.priority);
                  return (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="glass-card hover:bg-white/[0.025] hover:border-white/[0.04] p-3 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0">
                          {t.status === 'in_progress' ? (
                            <Icons.PlayCircle className="w-4 h-4 text-orange-400 animate-pulse" />
                          ) : (
                            <Icons.Clock className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-white truncate block accent-hover-text transition-colors">{t.title}</span>
                          <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                            {t.projectId ? safeProjects.find(p => p.id === t.projectId)?.name || 'General' : 'General'}
                          </span>
                        </div>
                      </div>

                      {/* Info badges */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Priority Badge */}
                        <div className={`flex items-center gap-1 text-[10px] font-medium font-mono ${prioInfo.color}`}>
                          {prioInfo.icon}
                          <span className="hidden sm:inline">{prioInfo.text}</span>
                        </div>

                        {/* Status Type tag */}
                        <span className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg capitalize">
                          {t.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-6 text-center space-y-2">
                <EmptyIllustration />
                <p className="text-xs text-slate-500 font-medium">
                  {lang === 'ru' ? 'Нет активных задач в фокусе. Начните что-нибудь новое!' : lang === 'uk' ? 'Немає активних завдань у фокусі. Почніть щось нове!' : 'No active tasks in focus. Capture a new duty!'}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Side Columns Context & Activities (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* UPCOMING RELEASES */}
          <div className="glass-card p-4 space-y-4">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400">{getTranslation(lang, 'upcomingReleases')}</h3>
            
            <div className="space-y-3.5">
              {(upcomingReleases ?? []).map(rel => (
                <div key={rel.id} className="flex items-start gap-3 relative group">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full accent-bg accent-glow mt-1.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">{rel.name}</span>
                      <span className="text-[9px] font-mono accent-text font-bold accent-bg-10 px-1 rounded">v{rel.version}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{rel.description}</p>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 block">{rel.date}</span>
                  </div>
                </div>
              ))}
              
              {upcomingReleases.length === 0 && (
                <p className="text-center py-2 text-[10px] text-slate-500 italic">
                  {getTranslation(lang, 'emptyRoadmap')}
                </p>
              )}
            </div>
          </div>

          {/* RECENT ACTIVITY LOGS */}
          <div className="glass-card p-4 space-y-4">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400">{getTranslation(lang, 'recentActivity')}</h3>
            
            <div className="space-y-3">
              {(recentActivities ?? []).map((act, index) => (
                <div 
                  key={index} 
                  onClick={() => setSelectedTask(act.task)}
                  className="flex items-start gap-3 cursor-pointer group min-w-0"
                >
                  <div className="mt-1 flex-shrink-0">
                    {act.action === 'created' ? (
                      <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400">
                        <Icons.Plus className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-lg accent-bg-10 accent-text">
                        <Icons.Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-white accent-hover-text transition-colors block truncate">
                      {act.task.title}
                    </span>
                    <p className="text-[10px] text-slate-500 truncate">{act.details}</p>
                    <span className="text-[9px] font-mono text-slate-600 block mt-0.5">{getRelativeTime(act.timestamp)}</span>
                  </div>
                </div>
              ))}

              {recentActivities.length === 0 && (
                <p className="text-center py-2 text-[10px] text-slate-500 italic">
                  {getTranslation(lang, 'recentActivityEmpty')}
                </p>
              )}
            </div>
          </div>

          {/* COMPACT SECONDARY METRICS */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {lang === 'ru' ? 'Статистика задач' : lang === 'uk' ? 'Статистика завдань' : 'Workspace Stats'}
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.02]">
                <span className="text-lg font-display font-medium text-white block">{totalTasks}</span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wide uppercase mt-1 block">Total</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.02]">
                <span className="text-lg font-display font-medium text-orange-400 block">{activeTasks}</span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wide uppercase mt-1 block">Active</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.02]">
                <span className="text-lg font-display font-medium accent-text block">{completedTasks}</span>
                <span className="text-[9px] text-slate-500 font-mono tracking-wide uppercase mt-1 block">Done</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

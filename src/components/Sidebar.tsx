import React, { useState } from 'react';
import { useStore } from '../store';
import { getTranslation } from '../localization';
import * as Icons from 'lucide-react';
import { TaskStatus, Project } from '../types';
import logo from '../../assets/icon.png';

export const Sidebar: React.FC = () => {
  const {
    tasks,
    projects,
    currentView,
    selectedProjectViewId,
    selectedTagViewName,
    setCurrentView,
    setSelectedProjectViewId,
    setSelectedTagViewName,
    settings,
    setIsCreateModalOpen,
    addProject,
    deleteProject,
    updateProject
  } = useStore();

  const lang = settings.language;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);
  
  // New Project State
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjColor, setNewProjColor] = useState('indigo');
  const [newProjIcon, setNewProjIcon] = useState('Folder');

  // Edit Project State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjColor, setEditProjColor] = useState('indigo');
  const [editProjIcon, setEditProjIcon] = useState('Folder');
  const [editProjGithubOwner, setEditProjGithubOwner] = useState('');
  const [editProjGithubRepo, setEditProjGithubRepo] = useState('');
  const [editProjGithubDefaultBranch, setEditProjGithubDefaultBranch] = useState('main');
  const [editProjLocalPath, setEditProjLocalPath] = useState('');

  // Dynamic status list
  const statusesList: { status: TaskStatus; labelKey: any; icon: string; bgClass: string; textClass: string }[] = [
    { status: 'planned', labelKey: 'planned', icon: 'Calendar', bgClass: 'bg-sky-500/10', textClass: 'text-sky-400' },
    { status: 'pending', labelKey: 'waiting', icon: 'Clock', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
    { status: 'in_progress', labelKey: 'inWork', icon: 'Flame', bgClass: 'bg-orange-500/10', textClass: 'text-orange-400' },
    { status: 'testing', labelKey: 'testing', icon: 'Terminal', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400' },
  ];

  // Colors available for projects
  const projectColors = ['indigo', 'emerald', 'sky', 'rose', 'amber', 'purple', 'teal'];
  
  // 16 Categories/Icons for projects
  const projectIcons = [
    { name: 'Folder', icon: 'Folder' },
    { name: 'Code', icon: 'Code' },
    { name: 'Browser', icon: 'Globe' },
    { name: 'API', icon: 'Network' },
    { name: 'Database', icon: 'Database' },
    { name: 'Mobile', icon: 'Smartphone' },
    { name: 'Desktop', icon: 'Monitor' },
    { name: 'Design', icon: 'Palette' },
    { name: 'Bug', icon: 'Bug' },
    { name: 'Rocket', icon: 'Rocket' },
    { name: 'Shield', icon: 'Shield' },
    { name: 'Settings', icon: 'Settings' },
    { name: 'GitHub', icon: 'Github' },
    { name: 'Cloud', icon: 'Cloud' },
    { name: 'Docs', icon: 'FileText' },
    { name: 'Terminal', icon: 'Terminal' }
  ];

  const colorMap: any = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    teal: 'text-teal-400'
  };

  const activeProjIds = new Set(projects.filter(p => p.status !== 'archived').map(p => p.id));

  const countTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status && (t.projectId === 'unassigned' || activeProjIds.has(t.projectId))).length;
  };

  const countTasksByProject = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    if (proj?.status === 'archived') return 0;
    return tasks.filter(t => t.projectId === projId && t.status !== 'completed' && t.status !== 'cancelled').length;
  };

  const handleAddNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    addProject(newProjName.trim(), 'Local SQLite project workspace', newProjColor, newProjIcon, '');
    setNewProjName('');
    setNewProjColor('indigo');
    setNewProjIcon('Folder');
    setIsNewProjectOpen(false);
  };

  const handleStartEditProject = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(proj.id);
    setEditProjName(proj.name);
    setEditProjColor(proj.color);
    setEditProjIcon(proj.icon);
    setEditProjGithubOwner(proj.githubOwner || '');
    setEditProjGithubRepo(proj.githubRepo || '');
    setEditProjGithubDefaultBranch(proj.githubDefaultBranch || 'main');
    setEditProjLocalPath(proj.localPath || '');
  };

  const handleSaveEditProject = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjName.trim()) return;
    
    const existing = projects.find(p => p.id === id);
    const owner = editProjGithubOwner.trim();
    const repo = editProjGithubRepo.trim();
    const defaultBranch = editProjGithubDefaultBranch.trim() || 'main';
    const localPath = editProjLocalPath.trim();
    
    await updateProject({
      id,
      name: editProjName.trim(),
      description: existing?.description || 'Local SQLite project workspace',
      color: editProjColor,
      icon: editProjIcon,
      emoji: '',
      status: existing?.status || 'active',
      pinned: existing?.pinned || false,
      createdDate: existing?.createdDate || new Date().toISOString(),
      githubOwner: owner,
      githubRepo: repo,
      githubDefaultBranch: defaultBranch,
      githubRemoteUrl: owner && repo ? `https://github.com/${owner}/${repo}` : '',
      localPath
    });
    setEditingProjectId(null);
  };

  const handleTogglePinProject = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateProject({
      ...proj,
      pinned: !proj.pinned
    });
  };

  const handleToggleArchiveProject = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    // If archiving, unpin
    await updateProject({
      ...proj,
      status: proj.status === 'active' ? 'archived' : 'active',
      pinned: proj.status === 'active' ? false : proj.pinned
    });
  };

  const getIcon = (name: string, cls: string = "w-4 h-4 shrink-0") => {
    const LucideIcon = (Icons as any)[name];
    if (LucideIcon) return <LucideIcon className={cls} />;
    return <Icons.Folder className={cls} />;
  };

  const activeProjects = projects.filter(p => p.status !== 'archived');
  const pinnedProjects = activeProjects.filter(p => p.pinned);
  const regularProjects = activeProjects.filter(p => !p.pinned);
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return (
    <>
      <div className={`${isCollapsed ? 'w-16' : 'w-56'} shrink-0 h-full flex flex-col bg-white/[0.015] backdrop-blur-[36px] rounded-b-2xl rounded-t-none border border-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.35)] select-none transition-all duration-300 ease-in-out relative overflow-hidden`}>
        {/* Liquid Glass reflection highlights */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none z-20" />
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none z-10" />
        
        {/* App Header Name */}
        <div 
          className={`p-3 border-b border-white/[0.02] flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'} overflow-hidden relative z-20`}
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className={`flex items-center ${isCollapsed ? 'flex-col justify-center' : 'gap-3'}`}>
            {/* Logo Image */}
            <div className="shrink-0">
              <img 
                src={logo} 
                alt="Flux Tasks Logo" 
                className={`${isCollapsed ? 'w-10 h-10' : 'w-11 h-11'} object-contain drop-shadow-[0_2px_10px_rgba(0,125,255,0.4)] transition-all duration-300`} 
              />
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 animate-fade-in font-display font-bold text-base tracking-tight leading-none">
                <span className="text-white">Flux</span>
                <span className="bg-gradient-to-r from-flux-blue to-flux-violet bg-clip-text text-transparent">Tasks</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg btn-ghost hover:text-white transition-colors ${isCollapsed ? 'mt-1' : ''}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {isCollapsed ? <Icons.ChevronRight className="w-4 h-4" /> : <Icons.ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
  
        {/* Workspace Quick Add Action */}
        <div className="px-3 pt-3 shrink-0 relative z-20">
          <button
            onClick={() => setIsCreateModalOpen(true, 'feature', 'planned')}
            className="btn-primary w-full py-2 px-2.5 flex items-center justify-center gap-2 text-xs text-white cursor-pointer transition-all duration-200 active:scale-[0.98]"
            title={getTranslation(lang, 'newTask')}
          >
            <Icons.Plus className="w-4 h-4 stroke-[2.5]" />
            {!isCollapsed && <span className="truncate">{getTranslation(lang, 'newTask')}</span>}
          </button>
        </div>
  
        {/* Main Navigation Scrollbar Area */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 select-none scrollbar-none relative z-20">
          
          {/* Dashboard */}
          <button
            onClick={() => { setCurrentView('dashboard'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'dashboard'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={getTranslation(lang, 'dashboard')}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.LayoutDashboard className="w-4 h-4 shrink-0 accent-text" />
              {!isCollapsed && <span className="truncate">{getTranslation(lang, 'dashboard')}</span>}
            </div>
          </button>
  
          {/* All Tasks */}
          <button
            onClick={() => { setCurrentView('all_tasks'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'all_tasks' && !selectedProjectViewId && !selectedTagViewName
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={getTranslation(lang, 'allTasks')}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.ListTodo className="w-4 h-4 shrink-0 text-blue-400" />
              {!isCollapsed && <span className="truncate">{getTranslation(lang, 'allTasks')}</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40">{tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (t.projectId === 'unassigned' || activeProjIds.has(t.projectId))).length}</span>}
          </button>
  
          {/* AI Prompts */}
          <button
            onClick={() => { setCurrentView('prompts'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'prompts'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={lang === 'ru' ? 'Промпты' : lang === 'uk' ? 'Промпти' : 'Prompts'}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.Cpu className="w-4 h-4 shrink-0 accent-text" />
              {!isCollapsed && <span className="truncate">{lang === 'ru' ? 'Промпты' : lang === 'uk' ? 'Промпти' : 'Prompts'}</span>}
            </div>
          </button>
  
          {/* Notes */}
          <button
            onClick={() => { setCurrentView('notes'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'notes'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={getTranslation(lang, 'notes')}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.StickyNote className="w-4 h-4 shrink-0 accent-text" />
              {!isCollapsed && <span className="truncate">{getTranslation(lang, 'notes')}</span>}
            </div>
          </button>
  
          {/* Roadmap */}
          <button
            onClick={() => { setCurrentView('roadmap'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'roadmap'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={getTranslation(lang, 'roadmap')}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.Map className="w-4 h-4 shrink-0 text-purple-400" />
              {!isCollapsed && <span className="truncate">{getTranslation(lang, 'roadmap')}</span>}
            </div>
          </button>
  
          {/* History */}
          <button
            onClick={() => { setCurrentView('history'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'history'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={lang === 'ru' ? 'История изменений' : lang === 'uk' ? 'Історія змін' : 'Activity History'}
          >
            <div className="flex items-center gap-2 truncate">
              <Icons.History className="w-4 h-4 shrink-0 text-amber-400" />
              {!isCollapsed && <span className="truncate">{lang === 'ru' ? 'История' : lang === 'uk' ? 'Історія' : 'History'}</span>}
            </div>
          </button>

          {/* Archive */}
          <button
            onClick={() => { setCurrentView('archive'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              currentView === 'archive'
                ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
            }`}
            title={lang === 'ru' ? 'Архив' : lang === 'uk' ? 'Архів' : 'Archive'}
          >
            <div className="flex items-center gap-2 truncate">
              <svg className="w-4 h-4 shrink-0 drop-shadow-[0_0_5px_rgba(255,90,217,0.35)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8Z" stroke="url(#archiveGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 3H2V7H22V3Z" fill="url(#archiveGrad)" />
                <path d="M10 12H14" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                <defs>
                  <linearGradient id="archiveGrad" x1="2" y1="3" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ff5ad9" />
                    <stop offset="100%" stopColor="#8c5bff" />
                  </linearGradient>
                </defs>
              </svg>
              {!isCollapsed && <span className="truncate">{lang === 'ru' ? 'Архив' : lang === 'uk' ? 'Архів' : 'Archive'}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40">
                {tasks.filter(t => t.status === 'completed' || t.status === 'cancelled').length}
              </span>
            )}
          </button>
  
          {/* PROJECTS SECTION */}
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-white/40 tracking-wider uppercase hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  {isProjectsExpanded ? <Icons.ChevronDown className="w-3 h-3" /> : <Icons.ChevronRight className="w-3 h-3" />}
                  <span>{getTranslation(lang, 'projects')}</span>
                </div>
                <Icons.Plus 
                  className="w-3.5 h-3.5 accent-hover-text transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsNewProjectOpen(true); }}
                />
              </button>
            ) : (
              <div className="w-full border-t border-glass-border/60 my-2" />
            )}
  
            {(!isCollapsed && isProjectsExpanded) && (
              <div className="pl-1.5 mt-1 space-y-1">
                {/* PINNED PROJECTS */}
                {pinnedProjects.length > 0 && (
                  <div className="space-y-0.5 border-b border-glass-border/40 pb-1 mb-1">
                    <div className="text-[9px] text-slate-500 font-bold tracking-widest px-2.5 uppercase select-none">
                      {lang === 'ru' ? 'Закрепленные' : 'Pinned'}
                    </div>
                    {pinnedProjects.map(proj => renderProjectRow(proj))}
                  </div>
                )}
  
                {/* REGULAR PROJECTS */}
                {regularProjects.map(proj => renderProjectRow(proj))}
  
                {/* ARCHIVED PROJECTS */}
                {archivedProjects.length > 0 && (
                  <div className="pt-1.5">
                    <button
                      onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                      className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-bold text-white/20 tracking-wider uppercase hover:text-white/40 transition-colors"
                    >
                      <span>{lang === 'ru' ? 'Архив проектов' : 'Archived'} ({archivedProjects.length})</span>
                      {isArchivedExpanded ? <Icons.ChevronDown className="w-2.5 h-2.5" /> : <Icons.ChevronRight className="w-2.5 h-2.5" />}
                    </button>
                    {isArchivedExpanded && (
                      <div className="space-y-0.5 mt-1 opacity-60">
                        {archivedProjects.map(proj => renderProjectRow(proj))}
                      </div>
                    )}
                  </div>
                )}
  
                {projects.length === 0 && (
                  <div className="text-[10px] text-slate-500 italic px-3 py-1">
                    {getTranslation(lang, 'noProjectsFound').substring(0, 30)}...
                  </div>
                )}
              </div>
            )}
  
            {/* COMPACT MODE PROJECTS ICON INDICATORS */}
            {isCollapsed && (
              <div className="flex flex-col items-center gap-2 pt-2">
                {pinnedProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectViewId(p.id);
                      setSelectedTagViewName(null);
                      setCurrentView('all_tasks');
                    }}
                    className={`p-2 rounded-xl border relative group active:scale-95 transition-all ${
                      selectedProjectViewId === p.id && currentView === 'all_tasks'
                        ? 'bg-white/10 border-white/20'
                        : 'bg-transparent border-transparent hover:bg-white/5'
                    }`}
                    title={p.name}
                  >
                    <span className={`${colorMap[p.color] || 'text-slate-400'} shrink-0`}>
                      {getIcon(p.icon, "w-4 h-4")}
                    </span>
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
  
          {/* WORKFLOW STATUS DIVISION */}
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold text-white/40 tracking-wider uppercase hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  {isStatusExpanded ? <Icons.ChevronDown className="w-3 h-3" /> : <Icons.ChevronRight className="w-3 h-3" />}
                  <span>{getTranslation(lang, 'chooseStatus')}</span>
                </div>
              </button>
            ) : (
              <div className="w-full border-t border-glass-border/60 my-2" />
            )}
  
            {(!isCollapsed && isStatusExpanded) && (
              <div className="pl-1.5 mt-1 space-y-0.5">
                {statusesList.map(({ status, labelKey, icon, bgClass, textClass }) => {
                  const isSelected = currentView === status;
                  const IconComponent = (Icons as any)[icon] || Icons.HelpCircle;
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        setCurrentView(status);
                        setSelectedProjectViewId(null);
                        setSelectedTagViewName(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
                          : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-0.5 rounded-sm ${bgClass} ${textClass}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span>{getTranslation(lang, labelKey)}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1 rounded bg-white/5 border border-white/5 text-slate-400">
                        {countTasksByStatus(status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
  
        </div>
  
        {/* Solid Settings footer link */}
        <div className="p-3 border-t border-white/[0.02] shrink-0 relative z-20">
          <button
            onClick={() => { setCurrentView('settings'); setSelectedProjectViewId(null); setSelectedTagViewName(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-[0.98] ${
              currentView === 'settings' 
                ? 'bg-white/[0.07] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]' 
                : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 border border-transparent'
            }`}
            title={getTranslation(lang, 'settings')}
          >
            <Icons.Settings className="w-4 h-4 text-slate-400" />
            {!isCollapsed && <span className="truncate">{getTranslation(lang, 'settings')}</span>}
          </button>
        </div>
      </div>

      {/* Add Project Modal (Premium Liquid Glass Dialog) */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={() => setIsNewProjectOpen(false)}>
          <div className="w-full max-w-[460px] rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl shadow-[0_24px_50px_rgba(0,0,0,0.5)] p-6 space-y-6 relative overflow-hidden select-none" onClick={(e) => e.stopPropagation()}>
            {/* Glass highlights */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
            
            <form onSubmit={handleAddNewProject} className="space-y-5">
              <div className="text-sm font-bold text-white uppercase tracking-wider">{getTranslation(lang, 'addProject')}</div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Название проекта' : lang === 'uk' ? 'Назва проекту' : 'Project Name'}</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={lang === 'ru' ? 'Введите название...' : lang === 'uk' ? 'Введіть назву...' : 'Enter name...'}
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full py-2 px-3.5 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-flux-azure focus:ring-1 focus:ring-flux-azure/30"
                />
              </div>

              {/* Colors list picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Цвет проекта' : lang === 'uk' ? 'Колір проекту' : 'Project Color'}</label>
                <div className="flex gap-2.5 justify-start items-center">
                  {projectColors.map((clr) => (
                    <span
                      key={clr}
                      onClick={() => setNewProjColor(clr)}
                      className={`w-5.5 h-5.5 rounded-full cursor-pointer transition-all duration-150 border-2 hover:scale-110 active:scale-95 ${
                        newProjColor === clr ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor: 
                          clr === 'indigo' ? '#818cf8' :
                          clr === 'emerald' ? '#34d399' :
                          clr === 'sky' ? '#38bdf8' :
                          clr === 'rose' ? '#fb7185' :
                          clr === 'amber' ? '#fbbf24' :
                          clr === 'purple' ? '#c084fc' : '#2dd4bf'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Icon selector with internal scroll */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Иконка' : lang === 'uk' ? 'Іконка' : 'Project Icon'}</label>
                <div className="grid grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto pr-1.5 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-0.5">
                  {projectIcons.map((item) => {
                    const IconComp = (Icons as any)[item.icon] || Icons.Folder;
                    const isSelected = newProjIcon === item.icon;
                    return (
                      <div 
                        key={item.name} 
                        onClick={() => setNewProjIcon(item.icon)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 select-none group/icon ${
                          isSelected 
                            ? 'bg-white/[0.08] border-white/20 text-white scale-[1.03] shadow-[0_4px_12px_rgba(0,0,0,0.15)]' 
                            : 'bg-white/[0.01] border-white/[0.04] text-slate-400 hover:bg-white/[0.04] hover:border-white/[0.08] hover:text-white'
                        }`}
                        title={item.name}
                      >
                        <IconComp className="w-5 h-5 transition-transform group-hover/icon:scale-110" />
                        <span className="text-[9px] font-medium tracking-wide">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl border border-white/5 text-slate-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  {getTranslation(lang, 'cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold rounded-xl accent-bg-gradient text-slate-950 hover:opacity-90 active:scale-95 transition-all accent-glow-sm cursor-pointer"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal (Premium Liquid Glass Dialog) */}
      {editingProjectId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={() => setEditingProjectId(null)}>
          <div className="w-full max-w-[460px] rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl shadow-[0_24px_50px_rgba(0,0,0,0.5)] p-6 space-y-6 relative overflow-hidden select-none" onClick={(e) => e.stopPropagation()}>
            {/* Glass highlights */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
            
            <form onSubmit={(e) => handleSaveEditProject(editingProjectId, e)} className="space-y-5">
              <div className="text-sm font-bold text-white uppercase tracking-wider">{lang === 'ru' ? 'Редактировать проект' : lang === 'uk' ? 'Редагувати проект' : 'Edit Project'}</div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Название проекта' : lang === 'uk' ? 'Назва проекту' : 'Project Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="Name..."
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  className="w-full py-2 px-3.5 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-flux-azure focus:ring-1 focus:ring-flux-azure/30"
                />
              </div>

              {/* Colors list picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Цвет проекта' : lang === 'uk' ? 'Колір проекту' : 'Project Color'}</label>
                <div className="flex gap-2.5 justify-start items-center">
                  {projectColors.map((clr) => (
                    <span
                      key={clr}
                      onClick={() => setEditProjColor(clr)}
                      className={`w-5.5 h-5.5 rounded-full cursor-pointer transition-all duration-150 border-2 hover:scale-110 active:scale-95 ${
                        editProjColor === clr ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor: 
                          clr === 'indigo' ? '#818cf8' :
                          clr === 'emerald' ? '#34d399' :
                          clr === 'sky' ? '#38bdf8' :
                          clr === 'rose' ? '#fb7185' :
                          clr === 'amber' ? '#fbbf24' :
                          clr === 'purple' ? '#c084fc' : '#2dd4bf'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Icon selector with internal scroll */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === 'ru' ? 'Иконка' : lang === 'uk' ? 'Іконка' : 'Project Icon'}</label>
                <div className="grid grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto pr-1.5 select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-0.5">
                  {projectIcons.map((item) => {
                    const IconComp = (Icons as any)[item.icon] || Icons.Folder;
                    const isSelected = editProjIcon === item.icon;
                    return (
                      <div 
                        key={item.name} 
                        onClick={() => setEditProjIcon(item.icon)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 select-none group/icon ${
                          isSelected 
                            ? 'bg-white/[0.08] border-white/20 text-white scale-[1.03] shadow-[0_4px_12px_rgba(0,0,0,0.15)]' 
                            : 'bg-white/[0.01] border-white/[0.04] text-slate-400 hover:bg-white/[0.04] hover:border-white/[0.08] hover:text-white'
                        }`}
                        title={item.name}
                      >
                        <IconComp className="w-5 h-5 transition-transform group-hover/icon:scale-110" />
                        <span className="text-[9px] font-medium tracking-wide">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GitHub Repository Linking & Local Git Path */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {lang === 'ru' ? 'Связь с GitHub и Локальный Git' : lang === 'uk' ? 'Зв\'язок з GitHub та Локальний Git' : 'GitHub & Local Git Linking'}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">GitHub Owner</label>
                    <input
                      type="text"
                      placeholder="e.g. Straniksss"
                      value={editProjGithubOwner}
                      onChange={(e) => setEditProjGithubOwner(e.target.value)}
                      className="w-full py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">GitHub Repo</label>
                    <input
                      type="text"
                      placeholder="e.g. Flux-Tasks"
                      value={editProjGithubRepo}
                      onChange={(e) => setEditProjGithubRepo(e.target.value)}
                      className="w-full py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Branch</label>
                    <input
                      type="text"
                      placeholder="main"
                      value={editProjGithubDefaultBranch}
                      onChange={(e) => setEditProjGithubDefaultBranch(e.target.value)}
                      className="w-full py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      {lang === 'ru' ? 'Локальный путь' : lang === 'uk' ? 'Локальний шлях' : 'Local Path'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="C:\..."
                        value={editProjLocalPath}
                        onChange={(e) => setEditProjLocalPath(e.target.value)}
                        className="flex-1 py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.api && window.api.selectDirectory) {
                            const dir = await window.api.selectDirectory();
                            if (dir) setEditProjLocalPath(dir);
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                      >
                        <Icons.FolderOpen className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => {
                    if (confirm(lang === 'ru' ? 'Вы уверены, что хотите удалить этот проект?' : lang === 'uk' ? 'Ви впевнені, що хочете видалити цей проект?' : 'Are you sure you want to delete this project?')) {
                      deleteProject(editingProjectId);
                      setEditingProjectId(null);
                    }
                  }} 
                  className="mr-auto px-4 py-2 text-xs font-semibold rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  {lang === 'ru' ? 'Удалить' : lang === 'uk' ? 'Видалити' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProjectId(null)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl border border-white/5 text-slate-300 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                >
                  {getTranslation(lang, 'cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold rounded-xl accent-bg-gradient text-slate-950 hover:opacity-90 active:scale-95 transition-all accent-glow-sm cursor-pointer"
                >
                  {lang === 'ru' ? 'Сохранить' : lang === 'uk' ? 'Зберегти' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  function renderProjectRow(proj: Project) {
    const isSelected = selectedProjectViewId === proj.id && currentView === 'all_tasks';
    
    return (
      <div
        key={proj.id}
        onClick={() => {
          setSelectedProjectViewId(proj.id);
          setSelectedTagViewName(null);
          setCurrentView('all_tasks');
        }}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs transition-all duration-200 cursor-pointer group/proj active:scale-[0.98] ${
          isSelected
            ? 'bg-white/[0.07] text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),_0_4px_12px_rgba(0,0,0,0.15)] border border-white/[0.08]'
            : 'text-white/60 hover:bg-white/[0.03] hover:text-white border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className={`${colorMap[proj.color] || 'text-slate-400'} shrink-0`}>
            {getIcon(proj.icon, "w-4 h-4 shrink-0")}
          </span>
          <span className="truncate">{proj.name}</span>
        </div>

        {/* Hover action menu buttons */}
        <div className="flex items-center gap-1">
          {/* Toggle pin (active projects only) */}
          {proj.status === 'active' && (
            <button 
              onClick={(e) => handleTogglePinProject(proj, e)}
              className={`hidden group-hover/proj:block p-0.5 text-slate-500 hover:text-amber-400 ${proj.pinned ? 'text-amber-400 block' : ''}`}
              title={proj.pinned ? "Unpin Project" : "Pin Project"}
            >
              <Icons.Pin className={`w-3 h-3 ${proj.pinned ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          )}

          {/* Toggle archive */}
          <button 
            onClick={(e) => handleToggleArchiveProject(proj, e)}
            className="hidden group-hover/proj:block p-0.5 text-slate-500 hover:text-purple-400"
            title={proj.status === 'active' ? "Archive Project" : "Restore Project"}
          >
            {proj.status === 'active' ? <Icons.Archive className="w-3 h-3" /> : <Icons.ArchiveRestore className="w-3 h-3" />}
          </button>

          {/* Edit details */}
          <button 
            onClick={(e) => handleStartEditProject(proj, e)}
            className="hidden group-hover/proj:block p-0.5 text-slate-500 hover:text-white"
            title="Edit Project"
          >
            <Icons.Edit3 className="w-3 h-3" />
          </button>

          {/* Tasks Count badge */}
          <span className="text-[9px] font-mono px-1 rounded bg-white/5 border border-white/5 text-slate-400 group-hover/proj:hidden">
            {countTasksByProject(proj.id)}
          </span>
        </div>
      </div>
    );
  }
};

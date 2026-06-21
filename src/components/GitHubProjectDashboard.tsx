import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useStore } from '../store';

interface GitHubProjectDashboardProps {
  projectId: string;
}

export const GitHubProjectDashboard: React.FC<GitHubProjectDashboardProps> = ({ projectId }) => {
  const { projects, tasks, updateTask, addTask, settings, showToast } = useStore();
  const lang = settings.language;
  const project = projects.find(p => p.id === projectId);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'issues' | 'git'>('dashboard');
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [repoData, setRepoData] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  
  // Loading & State flags
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingGit, setIsLoadingGit] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [isGitHubOnline, setIsGitHubOnline] = useState(false);
  const [gitActionLoading, setGitActionLoading] = useState<string | null>(null);

  // Commit and Tag input states
  const [commitMessage, setCommitMessage] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');

  // Dropdown for linking local tasks to issues
  const [linkingIssueNumber, setLinkingIssueNumber] = useState<number | null>(null);

  const t = {
    en: {
      gitHubDashboard: 'Repository Dashboard',
      gitStatus: 'Local Git Status',
      issuesTitle: 'GitHub Issues',
      gitActions: 'Git Actions',
      noLink: 'This project is not linked to a GitHub repository.',
      noGit: 'Local Git repository path is not configured for this project.',
      notConnected: 'GitHub is not connected in Settings.',
      stars: 'Stars',
      forks: 'Forks',
      issues: 'Open Issues',
      pulls: 'Pull Requests',
      defaultBranch: 'Default Branch',
      lastPush: 'Last Push',
      latestRelease: 'Latest Release',
      refreshBtn: 'Refresh',
      importBtn: 'Import as Task',
      linkBtn: 'Link Existing Task',
      openBrowser: 'Open in Browser',
      commitMsgPlaceholder: 'Enter commit message...',
      commitBtn: 'Create Commit',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Tag message (optional)...',
      createTagBtn: 'Create Tag',
      pullBtn: 'Git Pull',
      pushBtn: 'Git Push',
      openFolder: 'Open Folder',
      openTerminal: 'Open Terminal',
      confirmPush: 'Are you sure you want to push commits to origin?',
      confirmPull: 'Are you sure you want to pull remote changes?',
      gitOutput: 'Git Command Output',
      selectTaskToLink: 'Select local task to link...',
      linkConfirm: 'Link selected task',
      noIssues: 'No issues found in this repository.',
      offline: 'GitHub service is currently offline or unreachable.',
      localBranch: 'Current Branch',
      lastCommit: 'Last Commit',
      changedFiles: 'Changed (Unstaged) Files',
      stagedFiles: 'Staged Files',
      untrackedFiles: 'Untracked Files',
      noGitFiles: 'No changed, staged, or untracked files.',
      linkedRepo: 'Linked Repository',
      localPathLabel: 'Local Folder Path'
    },
    ru: {
      gitHubDashboard: 'Панель репозитория',
      gitStatus: 'Локальный Git Статус',
      issuesTitle: 'GitHub Задачи (Issues)',
      gitActions: 'Git Действия',
      noLink: 'Этот проект не связан с репозиторием GitHub.',
      noGit: 'Локальный путь к Git-репозиторию не настроен для этого проекта.',
      notConnected: 'GitHub не подключен в настройках.',
      stars: 'Звезды',
      forks: 'Форки',
      issues: 'Открытые задачи',
      pulls: 'Пулл-реквесты',
      defaultBranch: 'Ветка по умолчанию',
      lastPush: 'Последний пуш',
      latestRelease: 'Последний релиз',
      refreshBtn: 'Обновить',
      importBtn: 'Импортировать',
      linkBtn: 'Связать задачу',
      openBrowser: 'Открыть в браузере',
      commitMsgPlaceholder: 'Введите сообщение коммита...',
      commitBtn: 'Создать коммит',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Описание тега (необязательно)...',
      createTagBtn: 'Создать тег',
      pullBtn: 'Git Pull (Стянуть)',
      pushBtn: 'Git Push (Отправить)',
      openFolder: 'Открыть папку',
      openTerminal: 'Открыть терминал',
      confirmPush: 'Вы уверены, что хотите отправить коммиты в удаленный репозиторий?',
      confirmPull: 'Вы уверены, что хотите стянуть изменения из удаленного репозитория?',
      gitOutput: 'Результат выполнения команды Git',
      selectTaskToLink: 'Выберите локальную задачу...',
      linkConfirm: 'Связать выбранную задачу',
      noIssues: 'Задач в репозитории не найдено.',
      offline: 'Сервис GitHub в данный момент офлайн или недоступен.',
      localBranch: 'Текущая ветка',
      lastCommit: 'Последний коммит',
      changedFiles: 'Измененные (Unstaged) файлы',
      stagedFiles: 'Индексированные (Staged) файлы',
      untrackedFiles: 'Неотслеживаемые (Untracked) файлы',
      noGitFiles: 'Нет измененных, индексированных или неотслеживаемых файлов.',
      linkedRepo: 'Связанный репозиторий',
      localPathLabel: 'Локальный путь к папке'
    },
    uk: {
      gitHubDashboard: 'Панель репозиторію',
      gitStatus: 'Локальний Git Статус',
      issuesTitle: 'GitHub Завдання (Issues)',
      gitActions: 'Git Дії',
      noLink: 'Цей проект не пов\'язаний з репозиторієм GitHub.',
      noGit: 'Локальний шлях до Git-репозиторію не налаштований для цього проекту.',
      notConnected: 'GitHub не підключено в налаштуваннях.',
      stars: 'Зірки',
      forks: 'Форки',
      issues: 'Відкриті завдання',
      pulls: 'Пулл-реквести',
      defaultBranch: 'Гілка за замовчуванням',
      lastPush: 'Останній пуш',
      latestRelease: 'Останній реліз',
      refreshBtn: 'Оновити',
      importBtn: 'Імпортувати',
      linkBtn: 'Зв\'язати завдання',
      openBrowser: 'Відкрити в браузері',
      commitMsgPlaceholder: 'Введіть повідомлення коміту...',
      commitBtn: 'Створити коміт',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Опис тегу (необов\'язково)...',
      createTagBtn: 'Створити тег',
      pullBtn: 'Git Pull (Стягнути)',
      pushBtn: 'Git Push (Відправити)',
      openFolder: 'Відкрити папку',
      openTerminal: 'Відкрити термінал',
      confirmPush: 'Ви впевнені, що хочете відправити коміти у віддалений репозиторій?',
      confirmPull: 'Ви впевнені, що хочете стягнути зміни з віддаленого репозиторію?',
      gitOutput: 'Результат виконання команди Git',
      selectTaskToLink: 'Оберіть локальне завдання...',
      linkConfirm: 'Зв\'язати обране завдання',
      noIssues: 'Завдань у репозиторії не знайдено.',
      offline: 'Сервіс GitHub в даний момент офлайн або недоступний.',
      localBranch: 'Поточна гілка',
      lastCommit: 'Останній коміт',
      changedFiles: 'Змінені (Unstaged) файли',
      stagedFiles: 'Індексовані (Staged) файли',
      untrackedFiles: 'Невідстежувані (Untracked) файли',
      noGitFiles: 'Немає змінених, індексованих або невідстежуваних файлів.',
      linkedRepo: 'Зв\'язаний репозиторій',
      localPathLabel: 'Локальний шлях до папки'
    }
  }[lang === 'ru' || lang === 'uk' ? lang : 'en'];

  // Verify connection status on mount
  useEffect(() => {
    const getGithubStatus = async () => {
      if (window.api && window.api.github) {
        try {
          const res = await window.api.github.getStatus();
          setIsGitHubConnected(res.connected);
          setIsGitHubOnline(!!res.online);
        } catch (e) {}
      }
    };
    getGithubStatus();
  }, [projectId]);

  const loadDashboardData = async () => {
    if (!project?.githubOwner || !project?.githubRepo || !window.api) return;
    setIsLoadingDashboard(true);
    try {
      const res = await window.api.github.getRepositoryDashboard(project.githubOwner, project.githubRepo);
      if (res.success && res.data) {
        setRepoData(res.data);
      } else {
        showToast(res.error || 'Failed to fetch dashboard data', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const loadIssues = async () => {
    if (!project?.githubOwner || !project?.githubRepo || !window.api) return;
    setIsLoadingIssues(true);
    try {
      const res = await window.api.github.fetchIssues(project.githubOwner, project.githubRepo);
      if (res.success && res.issues) {
        setIssues(res.issues);
      } else {
        showToast(res.error || 'Failed to fetch issues', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsLoadingIssues(false);
    }
  };

  const loadGitStatus = async () => {
    if (!project?.localPath || !window.api) return;
    setIsLoadingGit(true);
    try {
      const res = await window.api.git.getStatus(project.localPath);
      if (res.success && res.status) {
        setGitStatus(res.status);
      } else {
        setGitStatus(null);
      }
    } catch (e: any) {
      // Local Git error
      setGitStatus(null);
    } finally {
      setIsLoadingGit(false);
    }
  };

  // Reload data when active tab changes
  useEffect(() => {
    if (activeTab === 'dashboard' && isGitHubConnected && isGitHubOnline) {
      loadDashboardData();
    } else if (activeTab === 'issues' && isGitHubConnected && isGitHubOnline) {
      loadIssues();
    } else if (activeTab === 'git') {
      loadGitStatus();
    }
  }, [activeTab, projectId, isGitHubConnected, isGitHubOnline]);

  // Task integration actions
  const handleImportIssue = async (issue: any) => {
    try {
      // Check if already imported
      const alreadyExists = tasks.some(t => t.githubIssueNumber === issue.number && t.projectId === projectId);
      if (alreadyExists) {
        showToast(lang === 'ru' ? 'Эта задача уже импортирована!' : 'This task is already imported!', 'info');
        return;
      }

      await addTask({
        title: issue.title,
        description: issue.body || '',
        projectId: projectId,
        priority: 'none',
        type: 'feature',
        status: issue.state === 'open' ? 'planned' : 'completed',
        tags: issue.labels || [],
        checklist: [],
        attachments: [],
        prompts: [],
        codeSnippets: [],
        notes: '',
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.htmlUrl,
        githubIssueState: issue.state
      });
      showToast(lang === 'ru' ? 'Задача успешно импортирована!' : 'Task imported successfully!', 'success');
      loadIssues();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleLinkTask = async (taskId: string, issue: any) => {
    try {
      const taskToLink = tasks.find(t => t.id === taskId);
      if (!taskToLink) return;

      await updateTask({
        ...taskToLink,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.htmlUrl,
        githubIssueState: issue.state
      }, `Linked to GitHub Issue #${issue.number}`);

      showToast(lang === 'ru' ? 'Задача привязана!' : 'Task linked successfully!', 'success');
      setLinkingIssueNumber(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Local Git Actions wrapper
  const triggerGitAction = async (actionName: string, actionFn: () => Promise<any>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setGitActionLoading(actionName);
    try {
      const res = await actionFn();
      if (res.success) {
        showToast(lang === 'ru' ? 'Действие выполнено!' : 'Git action completed!', 'success');
        if (res.output) {
          console.log(`Git output (${actionName}):`, res.output);
        }
        loadGitStatus();
      } else {
        showToast(res.error || 'Git operation failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setGitActionLoading(null);
    }
  };

  if (!project) return null;

  const isLinked = !!(project.githubOwner && project.githubRepo);
  const hasLocalPath = !!project.localPath;

  // Unlinked placeholder view
  if (!isLinked && !hasLocalPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none space-y-4">
        <Icons.Github className="w-16 h-16 text-slate-500/40" />
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold text-slate-300">{t.noLink}</h3>
          <p className="text-xs text-slate-500">{t.noGit}</p>
        </div>
        <p className="text-[11px] text-indigo-400 italic">
          {lang === 'ru' 
            ? 'Нажмите шестеренку (Редактировать проект) в боковом меню, чтобы указать репозиторий GitHub или локальный путь.' 
            : 'Click the edit gear icon next to the project in the sidebar to link repositories.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      
      {/* Title Header with Project Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2">
            <Icons.Github className="w-5 h-5 text-indigo-400" />
            <span>{project.name} — Git / GitHub</span>
          </h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
            {isLinked && (
              <span className="flex items-center gap-1">
                <Icons.Link2 className="w-3.5 h-3.5" />
                <span>{project.githubOwner}/{project.githubRepo}</span>
              </span>
            )}
            {isLinked && hasLocalPath && <span className="text-slate-600">|</span>}
            {hasLocalPath && (
              <span className="flex items-center gap-1">
                <Icons.Folder className="w-3.5 h-3.5" />
                <span>{project.localPath}</span>
              </span>
            )}
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-0.5 text-xs text-slate-400">
          {isLinked && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${
                activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              <Icons.LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.gitHubDashboard}</span>
            </button>
          )}
          {isLinked && (
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${
                activeTab === 'issues' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              <Icons.AlertCircle className="w-3.5 h-3.5" />
              <span>{t.issuesTitle}</span>
            </button>
          )}
          {hasLocalPath && (
            <button
              onClick={() => setActiveTab('git')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer duration-200 ${
                activeTab === 'git' ? 'bg-white/10 text-white shadow-sm' : 'hover:text-slate-200'
              }`}
            >
              <Icons.GitBranch className="w-3.5 h-3.5" />
              <span>Git</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection warning notices */}
      {activeTab !== 'git' && !isGitHubConnected && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.notConnected}</span>
        </div>
      )}

      {activeTab !== 'git' && isGitHubConnected && !isGitHubOnline && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Icons.WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.offline}</span>
        </div>
      )}

      {/* Tab Panel Renderers */}
      
      {/* 1. GitHub Dashboard Panel */}
      {activeTab === 'dashboard' && isLinked && isGitHubConnected && isGitHubOnline && (
        isLoadingDashboard ? (
          <div className="flex justify-center items-center py-20">
            <Icons.Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : repoData ? (
          <div className="space-y-6">
            {/* Repo Dashboard stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t.stars, value: repoData.stars, icon: Icons.Star, color: 'text-amber-400' },
                { label: t.forks, value: repoData.forks, icon: Icons.GitFork, color: 'text-sky-400' },
                { label: t.issues, value: repoData.openIssues, icon: Icons.AlertCircle, color: 'text-rose-400' },
                { label: t.pulls, value: repoData.openPullRequests, icon: Icons.GitPullRequest, color: 'text-purple-400' }
              ].map((stat, i) => (
                <div key={i} className="glass-card p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">{stat.label}</span>
                    <div className="text-xl font-bold text-white font-mono">{stat.value}</div>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-40 shrink-0`} />
                </div>
              ))}
            </div>

            {/* General Repo info panel */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{lang === 'ru' ? 'Информация о репозитории' : 'Repository Details'}</h3>
              
              {repoData.description && (
                <p className="text-xs text-slate-400 leading-relaxed italic">"{repoData.description}"</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-white/5">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.defaultBranch}:</span>
                    <span className="font-mono text-indigo-400 font-semibold">{repoData.defaultBranch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.lastPush}:</span>
                    <span className="text-slate-300 font-mono">{new Date(repoData.lastPushDate).toLocaleString(lang === 'ru' ? 'ru' : 'en')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.latestRelease}:</span>
                    <span className="font-bold text-emerald-400">
                      {repoData.latestRelease ? `${repoData.latestRelease.name} (${repoData.latestRelease.tagName})` : 'none'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GitHub:</span>
                    <a 
                      href={`https://github.com/${project.githubOwner}/${project.githubRepo}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
                    >
                      <span>{t.openBrowser}</span>
                      <Icons.ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={loadDashboardData}
                  className="py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Icons.RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.refreshBtn}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">
            {lang === 'ru' ? 'Нет данных для отображения.' : 'No repository data available.'}
          </div>
        )
      )}

      {/* 2. GitHub Issues Integration Panel */}
      {activeTab === 'issues' && isLinked && isGitHubConnected && isGitHubOnline && (
        isLoadingIssues ? (
          <div className="flex justify-center items-center py-20">
            <Icons.Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {t.issuesTitle} ({issues.length})
              </h3>
              <button
                onClick={loadIssues}
                className="py-1 px-2.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-1"
              >
                <Icons.RefreshCw className="w-3 h-3" />
                <span>{t.refreshBtn}</span>
              </button>
            </div>

            {issues.length > 0 ? (
              <div className="space-y-3">
                {issues.map(issue => {
                  const linkedTask = tasks.find(t => t.githubIssueNumber === issue.number && t.projectId === projectId);
                  const isLinkedToTask = !!linkedTask;

                  return (
                    <div 
                      key={issue.number} 
                      className={`glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${
                        issue.state === 'closed' ? 'border-l-rose-500/60' : 'border-l-emerald-500/60'
                      }`}
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-500">#{issue.number}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            issue.state === 'closed' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {issue.state}
                          </span>
                          
                          {/* Issue Labels */}
                          {issue.labels.map((lbl: string) => (
                            <span key={lbl} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-900 border border-white/5 text-slate-400">
                              {lbl}
                            </span>
                          ))}
                        </div>

                        <h4 className="text-xs font-bold text-white truncate">{issue.title}</h4>
                      </div>

                      {/* Import/Link buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={issue.htmlUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-white transition-colors"
                          title={t.openBrowser}
                        >
                          <Icons.ExternalLink className="w-4 h-4" />
                        </a>

                        {isLinkedToTask ? (
                          <div className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            {lang === 'ru' ? `Связано: ${linkedTask.title}` : `Linked: ${linkedTask.title}`}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleImportIssue(issue)}
                              className="py-1 px-2.5 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] cursor-pointer transition-colors"
                            >
                              {t.importBtn}
                            </button>

                            {/* Dropdown task linker */}
                            <div className="relative">
                              {linkingIssueNumber === issue.number ? (
                                <div className="absolute right-0 bottom-full mb-2 bg-[#0d0d15] border border-white/10 rounded-xl p-3 w-64 shadow-2xl z-30 space-y-2">
                                  <div className="text-[10px] text-slate-400 font-bold">{t.selectTaskToLink}</div>
                                  <select 
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleLinkTask(e.target.value, issue);
                                      }
                                    }}
                                    defaultValue=""
                                    className="w-full py-1 px-2 bg-slate-900 border border-white/10 rounded text-[10px] text-white"
                                  >
                                    <option value="" disabled>{t.selectTaskToLink}</option>
                                    {tasks
                                      .filter(t => t.projectId === projectId && !t.githubIssueNumber)
                                      .map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                      ))
                                    }
                                  </select>
                                  <button
                                    onClick={() => setLinkingIssueNumber(null)}
                                    className="w-full py-1 text-[9px] font-bold bg-white/5 text-slate-400 hover:text-white rounded"
                                  >
                                    {lang === 'ru' ? 'Отмена' : 'Cancel'}
                                  </button>
                                </div>
                              ) : null}

                              <button
                                onClick={() => setLinkingIssueNumber(linkingIssueNumber === issue.number ? null : issue.number)}
                                className="py-1 px-2.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-semibold text-[10px] cursor-pointer transition-colors"
                              >
                                {t.linkBtn}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs">
                {t.noIssues}
              </div>
            )}
          </div>
        )
      )}

      {/* 3. Local Git Panel */}
      {activeTab === 'git' && hasLocalPath && (
        isLoadingGit ? (
          <div className="flex justify-center items-center py-20">
            <Icons.Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : gitStatus ? (
          <div className="space-y-6">
            
            {/* Git quick action buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => window.api!.git.openFolder(project.localPath!)}
                className="p-3 glass-card glass-card-hover flex items-center gap-3 cursor-pointer text-xs font-semibold"
              >
                <Icons.FolderOpen className="w-5 h-5 text-indigo-400" />
                <span>{t.openFolder}</span>
              </button>

              <button
                onClick={() => window.api!.git.openTerminal(project.localPath!)}
                className="p-3 glass-card glass-card-hover flex items-center gap-3 cursor-pointer text-xs font-semibold"
              >
                <Icons.Terminal className="w-5 h-5 text-sky-400" />
                <span>{t.openTerminal}</span>
              </button>

              <button
                disabled={gitActionLoading !== null}
                onClick={() => triggerGitAction('pull', () => window.api!.git.pull(project.localPath!), t.confirmPull)}
                className="p-3 glass-card glass-card-hover flex items-center gap-3 cursor-pointer text-xs font-semibold disabled:opacity-50"
              >
                <Icons.Download className={`w-5 h-5 text-emerald-400 ${gitActionLoading === 'pull' ? 'animate-bounce' : ''}`} />
                <span>{t.pullBtn}</span>
              </button>

              <button
                disabled={gitActionLoading !== null}
                onClick={() => triggerGitAction('push', () => window.api!.git.push(project.localPath!), t.confirmPush)}
                className="p-3 glass-card glass-card-hover flex items-center gap-3 cursor-pointer text-xs font-semibold disabled:opacity-50"
              >
                <Icons.Upload className={`w-5 h-5 text-purple-400 ${gitActionLoading === 'push' ? 'animate-bounce' : ''}`} />
                <span>{t.pushBtn}</span>
              </button>
            </div>

            {/* Commits & Branch stats details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Branch and last commit details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="glass-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.gitStatus}</h3>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between pb-2 border-b border-white/5">
                      <span className="text-slate-500">{t.localBranch}:</span>
                      <span className="font-mono text-sky-400 font-bold flex items-center gap-1">
                        <Icons.GitBranch className="w-3.5 h-3.5" />
                        <span>{gitStatus.branch}</span>
                      </span>
                    </div>

                    <div className="space-y-1 pb-2 border-b border-white/5">
                      <div className="text-slate-500">{t.lastCommit}:</div>
                      <div className="font-mono text-[11px] text-slate-300 truncate bg-black/25 p-2 rounded-lg border border-white/5">
                        {gitStatus.lastCommit}
                      </div>
                    </div>

                    {gitStatus.remoteUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Remote:</span>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[240px]" title={gitStatus.remoteUrl}>{gitStatus.remoteUrl}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Git Commit action form */}
                <div className="glass-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{lang === 'ru' ? 'Сделать коммит' : 'Create Git Commit'}</h3>
                  <div className="space-y-3">
                    <input 
                      type="text"
                      placeholder={t.commitMsgPlaceholder}
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="w-full py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-flux-azure focus:ring-1 focus:ring-flux-azure/30"
                    />
                    <button
                      disabled={!commitMessage.trim() || gitActionLoading !== null}
                      onClick={() => triggerGitAction('commit', () => {
                        const msg = commitMessage;
                        setCommitMessage('');
                        return window.api!.git.commit(project.localPath!, msg);
                      })}
                      className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-flux-blue to-flux-indigo text-white text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-[0_4px_12px_rgba(91,92,255,0.15)] hover:shadow-[0_6px_18px_rgba(91,92,255,0.25)] disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Icons.Check className="w-4 h-4" />
                      <span>{t.commitBtn}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tag creation form */}
              <div className="space-y-4">
                <div className="glass-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{lang === 'ru' ? 'Создать тег' : 'Create Git Tag'}</h3>
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Tag Name</label>
                      <input 
                        type="text"
                        placeholder={t.tagNamePlaceholder}
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        className="w-full py-1.5 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Message</label>
                      <input 
                        type="text"
                        placeholder={t.tagMsgPlaceholder}
                        value={tagMessage}
                        onChange={(e) => setTagMessage(e.target.value)}
                        className="w-full py-1.5 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                      />
                    </div>
                    <button
                      disabled={!tagName.trim() || gitActionLoading !== null}
                      onClick={() => triggerGitAction('tag', () => {
                        const tag = tagName;
                        const msg = tagMessage;
                        setTagName('');
                        setTagMessage('');
                        return window.api!.git.tag(project.localPath!, tag, msg);
                      })}
                      className="w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Icons.Tag className="w-4 h-4" />
                      <span>{t.createTagBtn}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Changed and Staged files indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: t.stagedFiles, files: gitStatus.staged, color: 'text-emerald-400' },
                { title: t.changedFiles, files: gitStatus.changed, color: 'text-amber-400' },
                { title: t.untrackedFiles, files: gitStatus.untracked, color: 'text-slate-400' }
              ].map((group, idx) => (
                <div key={idx} className="glass-card p-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-2">
                    <span>{group.title}</span>
                    <span className={`font-mono ${group.color}`}>{group.files.length}</span>
                  </h4>

                  {group.files.length > 0 ? (
                    <ul className="text-[10px] font-mono text-slate-300 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {group.files.map((file: string, fIdx: number) => (
                        <li key={fIdx} className="truncate select-text" title={file}>
                          {file}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-500 italic text-[10px] py-4">{lang === 'ru' ? 'Нет файлов' : 'No files'}</div>
                  )}
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl p-6 text-slate-500 text-xs space-y-2">
            <Icons.AlertTriangle className="w-6 h-6 mx-auto text-amber-500/50" />
            <div>{lang === 'ru' ? 'Локальный Git-репозиторий недоступен или поврежден.' : 'Local Git repository is offline or unreachable.'}</div>
            <p className="text-[10px] text-slate-600 max-w-xs mx-auto">
              {lang === 'ru' 
                ? 'Убедитесь, что папка проекта инициализирована (содержит скрытую директорию .git).' 
                : 'Please verify the folder exists and is initialized as a Git repository.'}
            </p>
          </div>
        )
      )}

    </div>
  );
};

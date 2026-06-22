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
  const [commits, setCommits] = useState<Array<{ hash: string; shortHash: string; author: string; date: string; message: string }>>([]);
  const [localTags, setLocalTags] = useState<Array<{ name: string; date: string; message: string }>>([]);
  const [githubReleases, setGithubReleases] = useState<any[]>([]);
  const [gitError, setGitError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  
  // Loading & State flags
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingGit, setIsLoadingGit] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [isGitHubOnline, setIsGitHubOnline] = useState(false);
  const [gitActionLoading, setGitActionLoading] = useState<string | null>(null);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  // Commit and Tag input states
  const [commitMessage, setCommitMessage] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [isPrerelease, setIsPrerelease] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [releaseFiles, setReleaseFiles] = useState<string[]>([]);
  const [commitFiles, setCommitFiles] = useState<string[]>([]);

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
      selectCommitFilesBtn: 'Attach Files to Commit',
      commitPushBtn: 'Commit & Push to GitHub',
      localCommitOnlyBtn: 'Commit Locally',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Tag message / release notes (optional)...',
      createTagBtn: 'Create Tag',
      releaseTitlePlaceholder: 'Release title (optional)...',
      draftLabel: 'Save as Draft',
      prereleaseLabel: 'Set as Pre-release',
      selectFilesBtn: 'Attach Release Files',
      createReleaseBtn: 'Publish Release on GitHub',
      localTagOnlyBtn: 'Create Tag Locally',
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
      selectCommitFilesBtn: 'Прикрепить файлы к коммиту',
      commitPushBtn: 'Закоммитить и отправить на GitHub',
      localCommitOnlyBtn: 'Создать локальный коммит',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Описание тега / описание релиза (необязательно)...',
      createTagBtn: 'Создать тег',
      releaseTitlePlaceholder: 'Название релиза (необязательно)...',
      draftLabel: 'Сохранить как черновик',
      prereleaseLabel: 'Предварительный релиз (Pre-release)',
      selectFilesBtn: 'Прикрепить файлы к релизу',
      createReleaseBtn: 'Опубликовать релиз на GitHub',
      localTagOnlyBtn: 'Создать тег локально',
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
      selectCommitFilesBtn: 'Додати файли до коміту',
      commitPushBtn: 'Закомітити та відправити на GitHub',
      localCommitOnlyBtn: 'Створити локальний коміт',
      tagNamePlaceholder: 'v1.0.0...',
      tagMsgPlaceholder: 'Опис тегу / опис релізу (необов\'язково)...',
      createTagBtn: 'Створити тег',
      releaseTitlePlaceholder: 'Назва релізу (необов\'язково)...',
      draftLabel: 'Зберегти як чернетку',
      prereleaseLabel: 'Попередній реліз (Pre-release)',
      selectFilesBtn: 'Додати файли до релізу',
      createReleaseBtn: 'Опублікувати реліз на GitHub',
      localTagOnlyBtn: 'Створити тег локально',
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
    setGitError(null);
    try {
      const [statusRes, commitsRes, tagsRes, releasesRes] = await Promise.all([
        window.api.git.getStatus(project.localPath),
        window.api.git.getCommits(project.localPath, 30),
        window.api.git.getTags(project.localPath),
        project.githubOwner && project.githubRepo && isGitHubConnected && isGitHubOnline
          ? window.api.github.getReleases(project.githubOwner, project.githubRepo)
          : Promise.resolve({ success: true, releases: [] as any[] })
      ]);
      if (statusRes.success && statusRes.status) {
        setGitStatus(statusRes.status);
        setCommits(commitsRes.success ? commitsRes.commits || [] : []);
        setLocalTags(tagsRes.success ? tagsRes.tags || [] : []);
        setGithubReleases(releasesRes.success ? releasesRes.releases || [] : []);
      } else {
        setGitStatus(null);
        setGitError(statusRes.error || 'Не удалось получить статус Git.');
      }
    } catch (e: any) {
      setGitStatus(null);
      setGitError(e?.message || 'Не удалось получить статус Git.');
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

  const handleSelectCommitFiles = async () => {
    if (!window.api) return;
    try {
      const paths = await window.api.selectFile({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (paths) {
        const pathList = Array.isArray(paths) ? paths : [paths];
        setCommitFiles(prev => {
          const newPaths = pathList.filter(p => !prev.includes(p));
          return [...prev, ...newPaths];
        });
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCreateCommit = async (shouldPush: boolean) => {
    if (!commitMessage.trim()) {
      showToast(lang === 'ru' ? 'Введите сообщение коммита' : 'Enter commit message', 'error');
      return;
    }

    setGitActionLoading('commit');
    try {
      // 1. Copy all selected files to the project repository folder
      if (commitFiles.length > 0) {
        showToast(lang === 'ru' ? 'Копирование файлов в проект...' : 'Copying files to project...', 'info');
        for (const filePath of commitFiles) {
          const copyRes = await window.api!.git.copyFile(filePath, project.localPath!);
          if (!copyRes.success) {
            throw new Error(lang === 'ru' ? `Не удалось скопировать ${filePath}: ${copyRes.error}` : `Failed to copy ${filePath}: ${copyRes.error}`);
          }
        }
      }

      // 2. Commit the changes
      showToast(lang === 'ru' ? 'Создание коммита...' : 'Creating commit...', 'info');
      const commitRes = await window.api!.git.commit(project.localPath!, commitMessage);
      if (!commitRes.success) {
        throw new Error(lang === 'ru' ? `Не удалось закоммитить: ${commitRes.error}` : `Failed to commit: ${commitRes.error}`);
      }

      // 3. Push to GitHub if requested
      if (shouldPush) {
        showToast(lang === 'ru' ? 'Отправка коммитов в GitHub...' : 'Pushing commits to GitHub...', 'info');
        const pushRes = await window.api!.git.push(project.localPath!);
        if (!pushRes.success) {
          throw new Error(lang === 'ru' ? `Не удалось отправить изменения: ${pushRes.error}` : `Failed to push changes: ${pushRes.error}`);
        }
      }

      showToast(lang === 'ru' ? 'Коммит успешно создан!' : 'Commit created successfully!', 'success');
      
      // Clear inputs
      setCommitMessage('');
      setCommitFiles([]);
      loadGitStatus();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleSelectFiles = async () => {
    if (!window.api) return;
    try {
      const paths = await window.api.selectFile({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (paths) {
        const pathList = Array.isArray(paths) ? paths : [paths];
        setReleaseFiles(prev => {
          const newPaths = pathList.filter(p => !prev.includes(p));
          return [...prev, ...newPaths];
        });
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCreateGitHubRelease = async () => {
    if (!tagName.trim()) {
      showToast(lang === 'ru' ? 'Введите имя тега' : 'Enter tag name', 'error');
      return;
    }
    if (!project.githubOwner || !project.githubRepo) {
      showToast(lang === 'ru' ? 'Проект не связан с репозиторием GitHub' : 'Project is not linked to GitHub', 'error');
      return;
    }
    
    setGitActionLoading('githubRelease');
    try {
      // 1. Create local tag
      showToast(lang === 'ru' ? 'Создание локального тега...' : 'Creating local tag...', 'info');
      const tagRes = await window.api!.git.tag(project.localPath!, tagName, tagMessage);
      if (!tagRes.success) {
        showToast(`${lang === 'ru' ? 'Инфо о теге:' : 'Tag info:'} ${tagRes.error || tagRes.output}`, 'info');
      }

      // 2. Push tag to GitHub
      showToast(lang === 'ru' ? 'Отправка тега в GitHub...' : 'Pushing tag to GitHub...', 'info');
      const pushRes = await window.api!.git.pushTag(project.localPath!, tagName);
      if (!pushRes.success) {
        throw new Error(lang === 'ru' ? `Не удалось отправить тег: ${pushRes.error}` : `Failed to push tag: ${pushRes.error}`);
      }

      // 3. Create Release on GitHub
      showToast(lang === 'ru' ? 'Создание релиза на GitHub...' : 'Creating release on GitHub...', 'info');
      const releaseRes = await window.api!.github.createRelease(project.githubOwner, project.githubRepo, {
        tag_name: tagName,
        name: releaseTitle.trim() || tagName,
        body: tagMessage,
        draft: isDraft,
        prerelease: isPrerelease
      });

      if (!releaseRes.success || !releaseRes.release) {
        throw new Error(lang === 'ru' ? `Не удалось создать релиз: ${releaseRes.error}` : `Failed to create release: ${releaseRes.error}`);
      }

      const releaseId = releaseRes.release.id;

      // 4. Upload Attached Files
      if (releaseFiles.length > 0) {
        for (const filePath of releaseFiles) {
          const fileName = filePath.split(/[\\/]/).pop() || 'asset';
          showToast(`${lang === 'ru' ? 'Загрузка файла:' : 'Uploading:'} ${fileName}...`, 'info');
          const uploadRes = await window.api!.github.uploadReleaseAsset(
            project.githubOwner,
            project.githubRepo,
            releaseId,
            filePath,
            fileName
          );
          if (!uploadRes.success) {
            showToast(`${lang === 'ru' ? 'Не удалось загрузить' : 'Failed to upload'} ${fileName}: ${uploadRes.error}`, 'error');
          }
        }
      }

      showToast(lang === 'ru' ? 'Релиз успешно создан на GitHub!' : 'Release successfully created on GitHub!', 'success');
      
      // Clear fields
      setTagName('');
      setTagMessage('');
      setReleaseTitle('');
      setReleaseFiles([]);
      setIsDraft(false);
      setIsPrerelease(false);
      
      loadGitStatus();
      if (isGitHubConnected && isGitHubOnline) {
        loadDashboardData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleCreateCommitSafe = async (shouldPush: boolean) => {
    const message = commitMessage.trim();
    if (!message) {
      showToast(lang === 'ru' ? 'Введите сообщение коммита.' : 'Enter commit message.', 'error');
      return;
    }
    if (!project.localPath) {
      showToast(lang === 'ru' ? 'Локальный Git-репозиторий не настроен.' : 'Local Git repository is not configured.', 'error');
      return;
    }

    setGitActionLoading('commit');
    try {
      for (const filePath of commitFiles) {
        const copyResult = await window.api!.git.copyFile(filePath, project.localPath);
        if (!copyResult.success) throw new Error(copyResult.error || 'Не удалось добавить файл в проект.');
      }

      const commitResult = await window.api!.git.commit(project.localPath, message);
      if (!commitResult.success) throw new Error(commitResult.error || 'Не удалось создать коммит.');

      if (shouldPush) {
        const pushResult = await window.api!.git.push(project.localPath);
        if (!pushResult.success) throw new Error(pushResult.error || 'Не удалось отправить коммит.');
      }

      showToast(
        shouldPush
          ? (lang === 'ru' ? 'Коммит создан и отправлен.' : 'Commit created and pushed.')
          : (lang === 'ru' ? 'Коммит успешно создан.' : 'Commit created successfully.'),
        'success'
      );
      setCommitMessage('');
      setCommitFiles([]);
      await loadGitStatus();
    } catch (error: any) {
      showToast(error?.message || (lang === 'ru' ? 'Не удалось создать коммит.' : 'Failed to create commit.'), 'error');
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleCreateGitHubReleaseSafe = async () => {
    const normalizedTag = tagName.trim();
    if (!normalizedTag) {
      showToast(lang === 'ru' ? 'Введите имя тега.' : 'Enter tag name.', 'error');
      return;
    }
    if (!project.localPath) {
      showToast(lang === 'ru' ? 'Локальный Git-репозиторий не настроен.' : 'Local Git repository is not configured.', 'error');
      return;
    }
    if (!project.githubOwner || !project.githubRepo) {
      showToast(lang === 'ru' ? 'GitHub-репозиторий не подключён.' : 'GitHub repository is not connected.', 'error');
      return;
    }

    setGitActionLoading('githubRelease');
    try {
      const [localValidation, githubValidation] = await Promise.all([
        window.api!.git.validateRelease(project.localPath, normalizedTag),
        window.api!.github.validateRepositoryAccess(project.githubOwner, project.githubRepo)
      ]);
      if (!localValidation.success) throw new Error(localValidation.error || 'Не удалось проверить локальный репозиторий.');
      if (!githubValidation.success) throw new Error(githubValidation.error || 'Не удалось проверить доступ к GitHub.');

      const tagResult = await window.api!.git.tag(project.localPath, normalizedTag, tagMessage);
      if (!tagResult.success) throw new Error(tagResult.error || 'Не удалось создать тег.');

      const pushResult = await window.api!.git.pushTag(project.localPath, normalizedTag);
      if (!pushResult.success) throw new Error(pushResult.error || 'Не удалось опубликовать тег.');

      const releaseResult = await window.api!.github.createRelease(project.githubOwner, project.githubRepo, {
        tag_name: normalizedTag,
        name: releaseTitle.trim() || normalizedTag,
        body: tagMessage,
        draft: isDraft,
        prerelease: isPrerelease
      });
      if (!releaseResult.success || !releaseResult.release) {
        throw new Error(releaseResult.error || 'Не удалось создать GitHub-релиз.');
      }

      for (const filePath of releaseFiles) {
        const fileName = filePath.split(/[\\/]/).pop() || 'asset';
        const uploadResult = await window.api!.github.uploadReleaseAsset(
          project.githubOwner,
          project.githubRepo,
          releaseResult.release.id,
          filePath,
          fileName
        );
        if (!uploadResult.success) {
          showToast(uploadResult.error || `Не удалось загрузить ${fileName}.`, 'error');
        }
      }

      showToast(lang === 'ru' ? 'Тег и релиз успешно опубликованы.' : 'Tag and release published successfully!', 'success');
      setTagName('');
      setTagMessage('');
      setReleaseTitle('');
      setReleaseFiles([]);
      setIsDraft(false);
      setIsPrerelease(false);
      await loadGitStatus();
      if (isGitHubConnected && isGitHubOnline) await loadDashboardData();
    } catch (error: any) {
      showToast(error?.message || (lang === 'ru' ? 'Не удалось опубликовать релиз.' : 'Failed to publish release.'), 'error');
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
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                { label: lang === 'ru' ? 'Ветка' : 'Branch', value: gitStatus.branch || '—', icon: Icons.GitBranch },
                { label: lang === 'ru' ? 'Изменено' : 'Changed', value: `${gitStatus.changedCount || 0}`, icon: Icons.FilePenLine },
                { label: lang === 'ru' ? 'Неотслеживаемые' : 'Untracked', value: `${gitStatus.untrackedCount || 0}`, icon: Icons.FileQuestion },
                { label: lang === 'ru' ? 'Впереди origin' : 'Ahead of origin', value: `${gitStatus.ahead || 0}`, icon: Icons.ArrowUp },
                { label: lang === 'ru' ? 'Позади origin' : 'Behind origin', value: `${gitStatus.behind || 0}`, icon: Icons.ArrowDown }
              ].map(item => (
                <div key={item.label} className="glass-card p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl accent-bg-10 accent-text">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{item.label}</div>
                    <div className="text-sm font-mono font-bold text-white truncate">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Git quick action buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => setIsCommitModalOpen(true)}
                className="p-3 btn-accent flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold"
              >
                <Icons.GitCommitHorizontal className="w-5 h-5" />
                <span>{lang === 'ru' ? 'Новый коммит' : 'New Commit'}</span>
              </button>
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
                        {gitStatus.lastCommit
                          ? `${gitStatus.lastCommit.shortHash} — ${gitStatus.lastCommit.message}`
                          : (lang === 'ru' ? 'Коммитов пока нет' : 'No commits yet')}
                      </div>
                    </div>

                    {gitStatus.remoteUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Remote:</span>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[240px]" title={gitStatus.remoteUrl}>{gitStatus.remoteUrl}</span>
                      </div>
                    )}
                    {gitStatus.lastPush && (
                      <div className="space-y-1 pt-2 border-t border-white/5">
                        <div className="text-slate-500">{lang === 'ru' ? 'Последний push:' : 'Last push:'}</div>
                        <div className="text-[10px] text-slate-300">
                          {gitStatus.lastPush.message}
                          <span className="text-slate-600 ml-2">
                            {new Date(gitStatus.lastPush.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Git Commit action form */}
                <div className="glass-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {lang === 'ru' ? 'Создать коммит' : lang === 'uk' ? 'Створити коміт' : 'Create Git Commit'}
                  </h3>
                  <div className="space-y-3.5">
                    {/* Commit Message */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === 'ru' ? 'Сообщение коммита' : lang === 'uk' ? 'Повідомлення коміту' : 'Commit Message'}
                      </label>
                      <input 
                        type="text"
                        placeholder={t.commitMsgPlaceholder}
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="w-full py-2 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-500 focus:outline-none focus:border-flux-azure focus:ring-1 focus:ring-flux-azure/30"
                      />
                    </div>

                    {/* File Attachment Area for Commit */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === 'ru' ? 'Добавить файлы в коммит' : lang === 'uk' ? 'Додати файли до коміту' : 'Files to Commit'}
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectCommitFiles}
                        className="w-full py-2 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.08] text-slate-300 text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Icons.Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{t.selectCommitFilesBtn}</span>
                      </button>

                      {commitFiles.length > 0 && (
                        <div className="space-y-1.5 mt-2 bg-black/20 p-2 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                          {commitFiles.map((fPath, idx) => {
                            const name = fPath.split(/[\\/]/).pop();
                            return (
                              <div key={idx} className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-white/[0.02] p-1.5 rounded-lg border border-white/5">
                                <span className="truncate mr-2 flex items-center gap-1">
                                  <Icons.File className="w-3 h-3 text-slate-400" />
                                  <span title={fPath}>{name}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCommitFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-400 hover:text-rose-300 transition-colors p-0.5 cursor-pointer"
                                >
                                  <Icons.X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <button
                        disabled={!commitMessage.trim() || gitActionLoading !== null}
                        onClick={() => handleCreateCommitSafe(true)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-flux-blue to-flux-indigo text-white text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_4px_12px_rgba(91,92,255,0.15)] hover:shadow-[0_6px_18px_rgba(91,92,255,0.25)]"
                      >
                        {gitActionLoading === 'commit' ? (
                          <Icons.Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icons.Send className="w-4 h-4" />
                        )}
                        <span>{t.commitPushBtn}</span>
                      </button>

                      <button
                        disabled={!commitMessage.trim() || gitActionLoading !== null}
                        onClick={() => handleCreateCommitSafe(false)}
                        className="w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Icons.Check className="w-4 h-4 text-slate-400" />
                        <span>{t.localCommitOnlyBtn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tag & GitHub Release creation form */}
              <div className="space-y-4">
                <div className="glass-card p-5 space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {lang === 'ru' ? 'Создать тег и релиз' : lang === 'uk' ? 'Створити тег та реліз' : 'Create Tag & Release'}
                  </h3>
                  <div className="space-y-3.5">
                    {/* Tag name */}
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
                    {/* Optional Release Title */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === 'ru' ? 'Название релиза' : lang === 'uk' ? 'Назва релізу' : 'Release Title'}
                      </label>
                      <input 
                        type="text"
                        placeholder={t.releaseTitlePlaceholder}
                        value={releaseTitle}
                        onChange={(e) => setReleaseTitle(e.target.value)}
                        className="w-full py-1.5 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure"
                      />
                    </div>
                    {/* Release Description / Tag message */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === 'ru' ? 'Описание релиза / Сообщение тега' : lang === 'uk' ? 'Опис релізу / Повідомлення тегу' : 'Description / Tag Message'}
                      </label>
                      <textarea 
                        rows={2}
                        placeholder={t.tagMsgPlaceholder}
                        value={tagMessage}
                        onChange={(e) => setTagMessage(e.target.value)}
                        className="w-full py-1.5 px-3 text-xs rounded-xl border border-white/[0.08] bg-black/45 text-white placeholder-slate-600 focus:outline-none focus:border-flux-azure resize-none"
                      />
                    </div>

                    {/* File Attachment Area */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {lang === 'ru' ? 'Файлы для релиза' : lang === 'uk' ? 'Файли для релізу' : 'Release Assets (Files)'}
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectFiles}
                        className="w-full py-2 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.08] text-slate-300 text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Icons.Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{t.selectFilesBtn}</span>
                      </button>

                      {releaseFiles.length > 0 && (
                        <div className="space-y-1.5 mt-2 bg-black/20 p-2 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                          {releaseFiles.map((fPath, idx) => {
                            const name = fPath.split(/[\\/]/).pop();
                            return (
                              <div key={idx} className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-white/[0.02] p-1.5 rounded-lg border border-white/5">
                                <span className="truncate mr-2 flex items-center gap-1">
                                  <Icons.File className="w-3 h-3 text-slate-400" />
                                  <span title={fPath}>{name}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReleaseFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-400 hover:text-rose-300 transition-colors p-0.5 cursor-pointer"
                                >
                                  <Icons.X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* GitHub options (prerelease & draft checkboxes), shown only if project is linked to GitHub */}
                    {isLinked && (
                      <div className="flex gap-4 pt-1.5 text-xs text-slate-300">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={isDraft}
                            onChange={(e) => setIsDraft(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-black/45 text-indigo-500 focus:ring-0 cursor-pointer"
                          />
                          <span>{t.draftBadge || 'Draft'}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={isPrerelease}
                            onChange={(e) => setIsPrerelease(e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-black/45 text-indigo-500 focus:ring-0 cursor-pointer"
                          />
                          <span>{t.prereleaseBadge || 'Prerelease'}</span>
                        </label>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      {isLinked && isGitHubConnected && isGitHubOnline && (
                        <button
                          disabled={!tagName.trim() || gitActionLoading !== null}
                          onClick={handleCreateGitHubReleaseSafe}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_4px_12px_rgba(139,92,246,0.2)]"
                        >
                          {gitActionLoading === 'githubRelease' ? (
                            <Icons.Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Icons.Rocket className="w-4 h-4" />
                          )}
                          <span>{t.createReleaseBtn}</span>
                        </button>
                      )}
                      
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
                        <Icons.Tag className="w-4 h-4 text-slate-400" />
                        <span>{t.localTagOnlyBtn}</span>
                      </button>
                    </div>
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <section className="xl:col-span-2 glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Icons.History className="w-4 h-4 accent-text" />
                    <span>{lang === 'ru' ? 'Последние коммиты' : 'Recent Commits'}</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">{commits.length}</span>
                </div>
                {commits.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar performance-list">
                    {commits.map(commit => (
                      <div key={commit.hash} className="p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate">{commit.message}</div>
                            <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-mono accent-text">{commit.shortHash}</span>
                              <span>{commit.author}</span>
                              <span>{new Date(commit.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
                            </div>
                          </div>
                          <Icons.GitCommitHorizontal className="w-4 h-4 text-slate-600 shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-8 text-center">{lang === 'ru' ? 'Коммитов пока нет.' : 'No commits yet.'}</div>
                )}
              </section>

              <div className="space-y-6">
                <section className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Icons.Tag className="w-4 h-4 accent-text" />
                    <span>{lang === 'ru' ? 'Теги' : 'Tags'}</span>
                  </h3>
                  <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
                    {localTags.length > 0 ? localTags.map(tag => (
                      <div key={tag.name} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-black/20 border border-white/5">
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono font-bold accent-text truncate">{tag.name}</div>
                          <div className="text-[9px] text-slate-500 truncate">{tag.message || '—'}</div>
                        </div>
                        <span className="text-[9px] text-slate-600 shrink-0">
                          {tag.date ? new Date(tag.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US') : ''}
                        </span>
                      </div>
                    )) : (
                      <div className="text-[10px] text-slate-500 text-center py-4">{lang === 'ru' ? 'Тегов нет.' : 'No tags.'}</div>
                    )}
                  </div>
                </section>

                <section className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Icons.Rocket className="w-4 h-4 accent-text" />
                    <span>{lang === 'ru' ? 'Релизы GitHub' : 'GitHub Releases'}</span>
                  </h3>
                  <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
                    {githubReleases.length > 0 ? githubReleases.slice(0, 10).map(release => (
                      <a
                        key={release.id}
                        href={release.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-200 truncate">{release.name}</div>
                          <div className="text-[9px] font-mono text-slate-500">{release.tagName}</div>
                        </div>
                        <Icons.ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      </a>
                    )) : (
                      <div className="text-[10px] text-slate-500 text-center py-4">{lang === 'ru' ? 'Релизов нет.' : 'No releases.'}</div>
                    )}
                  </div>
                </section>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl p-6 text-slate-500 text-xs space-y-2">
            <Icons.AlertTriangle className="w-6 h-6 mx-auto text-amber-500/50" />
            {gitError && <div className="text-amber-300">{gitError}</div>}
            <div>{lang === 'ru' ? 'Локальный Git-репозиторий недоступен или поврежден.' : 'Local Git repository is offline or unreachable.'}</div>
            <p className="text-[10px] text-slate-600 max-w-xs mx-auto">
              {lang === 'ru' 
                ? 'Убедитесь, что папка проекта инициализирована (содержит скрытую директорию .git).' 
                : 'Please verify the folder exists and is initialized as a Git repository.'}
            </p>
          </div>
        )
      )}

      {isCommitModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setIsCommitModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.65)] p-6 space-y-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl accent-bg-15 accent-text">
                  <Icons.GitCommitHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{lang === 'ru' ? 'Создать коммит' : 'Create Commit'}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === 'ru' ? 'Все изменённые файлы будут добавлены через git add -A.' : 'All changed files will be staged with git add -A.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCommitModalOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={4}
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder={lang === 'ru' ? 'Что изменилось?' : 'What changed?'}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3.5 py-3 text-xs text-white placeholder-slate-600 focus:outline-none accent-focus"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={!commitMessage.trim() || gitActionLoading !== null}
                onClick={async () => {
                  await handleCreateCommitSafe(false);
                  setIsCommitModalOpen(false);
                }}
                className="py-2.5 rounded-xl btn-secondary text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icons.Check className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Коммит локально' : 'Commit Locally'}</span>
              </button>
              <button
                disabled={!commitMessage.trim() || gitActionLoading !== null}
                onClick={async () => {
                  await handleCreateCommitSafe(true);
                  setIsCommitModalOpen(false);
                }}
                className="py-2.5 rounded-xl btn-accent text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {gitActionLoading === 'commit' ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Send className="w-4 h-4" />}
                <span>{lang === 'ru' ? 'Коммит и push' : 'Commit & Push'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

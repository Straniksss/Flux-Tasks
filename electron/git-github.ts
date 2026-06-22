import { ipcMain, safeStorage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { loadSettings, saveSetting } from './database';
import * as http from 'http';

const execFileAsync = promisify(execFile);

type GitFailureContext = 'repository' | 'status' | 'commit' | 'pull' | 'push' | 'tag' | 'pushTag';

function getCommandErrorText(error: any): string {
  return [
    error?.stderr,
    error?.stdout,
    error?.message
  ].filter(Boolean).join('\n').toLowerCase();
}

function toFriendlyGitError(error: any, context: GitFailureContext): string {
  const text = getCommandErrorText(error);

  if (text.includes('not a git repository') || text.includes('outside repository')) {
    return 'Выбранная папка не является Git-репозиторием.';
  }
  if (text.includes('does not have any commits yet') || text.includes('unknown revision') || text.includes('bad revision')) {
    return 'В репозитории пока нет коммитов.';
  }
  if (text.includes('nothing to commit') || text.includes('no changes added to commit')) {
    return 'Нет изменений для коммита.';
  }
  if (text.includes('please tell me who you are') || text.includes('unable to auto-detect email address')) {
    return 'Не настроены имя и email автора Git.';
  }
  if (text.includes('already exists')) {
    return context === 'tag' ? 'Тег уже существует.' : 'Объект уже существует.';
  }
  if (text.includes('could not read username') || text.includes('authentication failed') || text.includes('permission denied')) {
    return 'Нет доступа к удалённому репозиторию. Проверьте авторизацию Git.';
  }
  if (text.includes('repository not found')) {
    return 'GitHub-репозиторий не найден или у вас нет к нему доступа.';
  }
  if (text.includes('could not resolve host') || text.includes('failed to connect') || text.includes('network is unreachable')) {
    return 'Не удалось подключиться к GitHub. Проверьте интернет-соединение.';
  }
  if (text.includes('non-fast-forward') || text.includes('fetch first') || text.includes('rejected')) {
    return 'Удалённая ветка содержит новые изменения. Сначала выполните Git Pull.';
  }
  if (text.includes('no upstream branch') || text.includes('has no upstream branch')) {
    return 'Для текущей ветки не настроена удалённая ветка.';
  }
  if (text.includes('couldn\'t find remote ref') || text.includes('no such ref')) {
    return 'Удалённая ветка или тег не найдены.';
  }
  if (text.includes('cannot be resolved to branch')) {
    return 'Git ошибочно интерпретировал тег как ветку. Повторите публикацию после обновления приложения.';
  }

  switch (context) {
    case 'repository': return 'Не удалось проверить Git-репозиторий.';
    case 'status': return 'Не удалось получить статус Git.';
    case 'commit': return 'Не удалось создать коммит.';
    case 'pull': return 'Не удалось получить изменения из удалённого репозитория.';
    case 'push': return 'Не удалось отправить изменения в удалённый репозиторий.';
    case 'tag': return 'Не удалось создать тег.';
    case 'pushTag': return 'Не удалось опубликовать тег.';
  }
}

function toFriendlyGithubError(error: any): string {
  const original = String(error?.message || error || '');
  const text = original.toLowerCase();
  if (
    text.includes('github не подключён') ||
    text.includes('токен github недействителен') ||
    text.includes('нет доступа к репозиторию') ||
    text.includes('github-репозиторий не найден') ||
    text.includes('github временно отклонил')
  ) {
    return original;
  }
  if (text.includes('no token') || text.includes('not connected')) {
    return 'GitHub не подключён. Добавьте токен в настройках.';
  }
  if (text.includes('(401)')) {
    return 'Токен GitHub недействителен или истёк.';
  }
  if (text.includes('(403)')) {
    return 'Нет доступа к репозиторию или недостаточно прав токена.';
  }
  if (text.includes('(404)')) {
    return 'GitHub-репозиторий не найден или недоступен.';
  }
  if (text.includes('fetch failed') || text.includes('timeout')) {
    return 'Не удалось подключиться к GitHub. Проверьте интернет-соединение.';
  }
  return 'Не удалось выполнить запрос к GitHub.';
}

export function getDecryptedToken(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    const settings = loadSettings();
    const encryptedHex = settings['github_token_encrypted'];
    if (!encryptedHex) return null;
    const decryptedBuffer = safeStorage.decryptString(Buffer.from(encryptedHex, 'hex'));
    return decryptedBuffer;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return null;
  }
}

export function saveEncryptedToken(token: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return false;
    }
    const encryptedHex = safeStorage.encryptString(token).toString('hex');
    saveSetting('github_token_encrypted', encryptedHex);
    return true;
  } catch (err) {
    console.error('Failed to encrypt/save token:', err);
    return false;
  }
}

export function deleteToken() {
  saveSetting('github_token_encrypted', '');
  saveSetting('github_username', '');
  saveSetting('github_avatar_url', '');
  saveSetting('github_scopes', '');
  saveSetting('github_connected', 'false');
}

async function makeGithubRequest(endpoint: string, options: any = {}) {
  const token = getDecryptedToken();
  if (!token) {
    throw new Error('GitHub не подключён. Добавьте токен в настройках.');
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Flux-Tasks-App',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    throw new Error('Токен GitHub недействителен или истёк.');
  }
  if (response.status === 403) {
    throw new Error('Нет доступа к репозиторию или недостаточно прав токена.');
  }
  if (response.status === 404) {
    throw new Error('GitHub-репозиторий не найден или недоступен.');
  }
  if (response.status === 422) {
    throw new Error(
      endpoint.includes('/releases')
        ? 'Релиз для этого тега уже существует или содержит некорректные данные.'
        : 'GitHub отклонил данные запроса.'
    );
  }
  
  if (!response.ok) {
    throw new Error(`GitHub временно отклонил запрос (код ${response.status}).`);
  }
  
  if (response.status === 204) {
    return { success: true };
  }
  
  return await response.json();
}

async function runGitCommand(localPath: string, args: string[]): Promise<string> {
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local directory does not exist: ${localPath}`);
  }
  
  const settings = loadSettings();
  const gitPath = settings['gitPath'] || 'git';
  
  const { stdout, stderr } = await execFileAsync(gitPath, args, {
    cwd: localPath,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0'
    }
  });
  return stdout || stderr;
}

async function inspectLocalRepository(localPath: string) {
  if (!localPath || !fs.existsSync(localPath)) {
    throw new Error('LOCAL_PATH_MISSING');
  }

  try {
    const inside = (await runGitCommand(localPath, ['rev-parse', '--is-inside-work-tree'])).trim();
    if (inside !== 'true') throw new Error('NOT_GIT_REPOSITORY');
  } catch (error) {
    throw new Error(toFriendlyGitError(error, 'repository'));
  }

  let hasCommits = true;
  try {
    await runGitCommand(localPath, ['rev-parse', '--verify', 'HEAD']);
  } catch {
    hasCommits = false;
  }

  let branch = '';
  if (hasCommits) {
    try {
      branch = (await runGitCommand(localPath, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim();
    } catch {
      branch = '';
    }
  }

  let remoteUrl = '';
  try {
    remoteUrl = (await runGitCommand(localPath, ['remote', 'get-url', 'origin'])).trim();
  } catch {
    remoteUrl = '';
  }

  return {
    hasCommits,
    branch,
    hasOrigin: Boolean(remoteUrl),
    remoteUrl
  };
}

async function tagExists(localPath: string, tagName: string): Promise<boolean> {
  try {
    await runGitCommand(localPath, ['show-ref', '--verify', '--quiet', `refs/tags/${tagName}`]);
    return true;
  } catch {
    return false;
  }
}

let oauthServer: http.Server | null = null;

function startLocalOauthServer(clientId: string, clientSecret: string, onTokenReceived: (token: string) => void, onError: (err: string) => void) {
  if (oauthServer) {
    try { oauthServer.close(); } catch (e) {}
  }

  oauthServer = http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
      
      if (urlObj.pathname === '/callback') {
        const code = urlObj.searchParams.get('code');
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h3>Authorization code missing. Please try again.</h3>');
          onError('Authorization code missing');
          oauthServer?.close();
          oauthServer = null;
          return;
        }

        try {
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Flux-Tasks-App'
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code: code
            })
          });

          if (!tokenResponse.ok) {
            throw new Error(`GitHub token exchange failed: ${tokenResponse.statusText}`);
          }

          const data = await tokenResponse.json() as any;
          if (data.error) {
            throw new Error(data.error_description || data.error);
          }

          const accessToken = data.access_token;
          if (!accessToken) {
            throw new Error('Access token not found in GitHub response');
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0f172a; color: white; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <h1 style="color: #10b981; margin: 0 0 10px 0;">Flux Tasks Authorized!</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">GitHub account connected successfully. You can close this browser tab now.</p>
            </div>
          `);

          onTokenReceived(accessToken);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h3>Error: ${err.message}</h3>`);
          onError(err.message);
        } finally {
          setTimeout(() => {
            oauthServer?.close();
            oauthServer = null;
          }, 1000);
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    } catch (e: any) {
      res.writeHead(500);
      res.end(`Server Error: ${e.message}`);
    }
  });

  oauthServer.listen(54124, '127.0.0.1', () => {
    console.log('Local OAuth callback server running on http://127.0.0.1:54124');
  });
}

export function registerGithubGitHandlers() {
  // GitHub: Connect with token
  ipcMain.handle('github:connect', async (event, token) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Flux-Tasks-App'
        }
      });
      
      if (!response.ok) {
        return { success: false, error: `Invalid token or API error (${response.status})` };
      }
      
      const user = await response.json();
      const scopesHeader = response.headers.get('x-oauth-scopes') || '';
      const scopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);
      
      saveEncryptedToken(token);
      saveSetting('github_username', user.login || '');
      saveSetting('github_avatar_url', user.avatar_url || '');
      saveSetting('github_scopes', JSON.stringify(scopes));
      saveSetting('github_connected', 'true');
      
      return {
        success: true,
        user: {
          username: user.login,
          avatarUrl: user.avatar_url,
          scopes
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Disconnect
  ipcMain.handle('github:disconnect', async () => {
    try {
      deleteToken();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Status
  ipcMain.handle('github:getStatus', async () => {
    try {
      const settings = loadSettings();
      const isConnected = settings['github_connected'] === 'true';
      const clientId = settings['github_client_id'] || '';
      const clientSecret = settings['github_client_secret'] || '';

      if (!isConnected) {
        return { connected: false, clientId, clientSecret };
      }
      
      const username = settings['github_username'] || '';
      const avatarUrl = settings['github_avatar_url'] || '';
      let scopes: string[] = [];
      try {
        if (settings['github_scopes']) {
          scopes = JSON.parse(settings['github_scopes']);
        }
      } catch (e) {}
      
      let online = false;
      try {
        const token = getDecryptedToken();
        if (token) {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Flux-Tasks-App'
            },
            signal: AbortSignal.timeout(3000)
          });
          if (response.ok) {
            online = true;
            const user = await response.json();
            saveSetting('github_username', user.login || '');
            saveSetting('github_avatar_url', user.avatar_url || '');
            const scopesHeader = response.headers.get('x-oauth-scopes') || '';
            const freshScopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);
            saveSetting('github_scopes', JSON.stringify(freshScopes));
          }
        }
      } catch (e) {
        // network error / offline
      }
      
      return {
        connected: true,
        online,
        clientId,
        clientSecret,
        user: {
          username,
          avatarUrl,
          scopes
        }
      };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  });

  // GitHub: Start OAuth direct login via Browser
  ipcMain.handle('github:startOAuth', async (event, clientId, clientSecret) => {
    try {
      const finalClientId = (clientId || '').trim();
      const finalClientSecret = (clientSecret || '').trim();
      
      if (!finalClientId || !finalClientSecret) {
        return { success: false, error: 'OAuth Client ID or Client Secret is missing. Please configure them first.' };
      }

      const redirectUri = 'http://127.0.0.1:54124/callback';
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${finalClientId}&scope=repo,read:user,workflow&redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      return new Promise((resolve) => {
        startLocalOauthServer(finalClientId, finalClientSecret, async (token) => {
          try {
            const response = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Flux-Tasks-App'
              }
            });
            
            if (!response.ok) {
              resolve({ success: false, error: `Invalid token or API error (${response.status})` });
              return;
            }
            
            const user = await response.json();
            const scopesHeader = response.headers.get('x-oauth-scopes') || '';
            const scopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);
            
            saveEncryptedToken(token);
            saveSetting('github_username', user.login || '');
            saveSetting('github_avatar_url', user.avatar_url || '');
            saveSetting('github_scopes', JSON.stringify(scopes));
            saveSetting('github_connected', 'true');
            
            // Persist OAuth credentials
            saveSetting('github_client_id', finalClientId);
            saveSetting('github_client_secret', finalClientSecret);

            resolve({
              success: true,
              user: {
                username: user.login,
                avatarUrl: user.avatar_url,
                scopes
              }
            });
          } catch (e: any) {
            resolve({ success: false, error: e.message });
          }
        }, (err) => {
          resolve({ success: false, error: err });
        });

        // Open browser URL
        shell.openExternal(authUrl);
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Fetch User Repos
  ipcMain.handle('github:fetchRepos', async () => {
    try {
      const repos = await makeGithubRequest('/user/repos?per_page=100&sort=updated');
      const mapped = repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        description: r.description,
        private: r.private,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch
      }));
      return { success: true, repos: mapped };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Repo Dashboard metadata
  ipcMain.handle('github:getRepositoryDashboard', async (event, owner, repo) => {
    try {
      const repoData = await makeGithubRequest(`/repos/${owner}/${repo}`);
      
      let pullsCount = 0;
      try {
        const searchResult = await makeGithubRequest(`/search/issues?q=repo:${owner}/${repo}+is:pr+is:open&per_page=1`);
        pullsCount = searchResult.total_count || 0;
      } catch (e) {
        console.error('Failed to fetch open pulls count:', e);
      }
      
      let latestRelease = null;
      try {
        latestRelease = await makeGithubRequest(`/repos/${owner}/${repo}/releases/latest`);
      } catch (e) {
        // repository might not have releases
      }
      
      return {
        success: true,
        data: {
          name: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description || '',
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          openIssues: repoData.open_issues_count - pullsCount,
          openPullRequests: pullsCount,
          latestRelease: latestRelease ? {
            name: latestRelease.name || latestRelease.tag_name,
            tagName: latestRelease.tag_name,
            publishedAt: latestRelease.published_at
          } : null,
          defaultBranch: repoData.default_branch,
          lastPushDate: repoData.pushed_at
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('github:validateRepositoryAccess', async (event, owner, repo) => {
    try {
      if (!owner || !repo) {
        return { success: false, error: 'GitHub-репозиторий не подключён.' };
      }
      if (!getDecryptedToken()) {
        return { success: false, error: 'GitHub не подключён. Добавьте токен в настройках.' };
      }

      const repository = await makeGithubRequest(`/repos/${owner}/${repo}`);
      const canPush = Boolean(repository.permissions?.push || repository.permissions?.admin);
      if (!canPush) {
        return { success: false, error: 'Нет прав на публикацию в этом репозитории.' };
      }

      return {
        success: true,
        repository: {
          fullName: repository.full_name,
          private: repository.private,
          defaultBranch: repository.default_branch,
          canPush
        }
      };
    } catch (error: any) {
      return { success: false, error: toFriendlyGithubError(error) };
    }
  });

  // GitHub: Fetch Issues
  ipcMain.handle('github:fetchIssues', async (event, owner, repo) => {
    try {
      const issues = await makeGithubRequest(`/repos/${owner}/${repo}/issues?state=all&per_page=100`);
      const filtered = issues
        .filter((i: any) => !i.pull_request)
        .map((i: any) => ({
          number: i.number,
          title: i.title,
          body: i.body || '',
          state: i.state,
          htmlUrl: i.html_url,
          labels: i.labels.map((l: any) => l.name)
        }));
      return { success: true, issues: filtered };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Get Issue
  ipcMain.handle('github:getIssue', async (event, owner, repo, number) => {
    try {
      const issue = await makeGithubRequest(`/repos/${owner}/${repo}/issues/${number}`);
      return {
        success: true,
        issue: {
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state,
          htmlUrl: issue.html_url,
          labels: issue.labels.map((l: any) => l.name)
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Create Issue
  ipcMain.handle('github:createIssue', async (event, owner, repo, issueData) => {
    try {
      const issue = await makeGithubRequest(`/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: issueData.title,
          body: issueData.body,
          labels: issueData.labels
        })
      });
      return {
        success: true,
        issue: {
          number: issue.number,
          htmlUrl: issue.html_url,
          state: issue.state
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Update Issue Status
  ipcMain.handle('github:updateIssueStatus', async (event, owner, repo, number, state) => {
    try {
      await makeGithubRequest(`/repos/${owner}/${repo}/issues/${number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state })
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Get Releases
  ipcMain.handle('github:getReleases', async (event, owner, repo) => {
    try {
      const releases = await makeGithubRequest(`/repos/${owner}/${repo}/releases?per_page=50`);
      const mapped = releases.map((r: any) => ({
        id: r.id,
        name: r.name || r.tag_name,
        tagName: r.tag_name,
        body: r.body || '',
        draft: r.draft,
        prerelease: r.prerelease,
        publishedAt: r.published_at,
        htmlUrl: r.html_url,
        assets: r.assets.map((a: any) => ({
          id: a.id,
          name: a.name,
          size: a.size,
          downloadCount: a.download_count,
          browserDownloadUrl: a.browser_download_url
        }))
      }));
      return { success: true, releases: mapped };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // GitHub: Create Release
  ipcMain.handle('github:createRelease', async (event, owner, repo, releaseData) => {
    try {
      const release = await makeGithubRequest(`/repos/${owner}/${repo}/releases`, {
        method: 'POST',
        body: JSON.stringify({
          tag_name: releaseData.tag_name,
          name: releaseData.name,
          body: releaseData.body,
          draft: releaseData.draft,
          prerelease: releaseData.prerelease
        })
      });
      return {
        success: true,
        release: {
          id: release.id,
          tagName: release.tag_name,
          htmlUrl: release.html_url,
          uploadUrl: release.upload_url
        }
      };
    } catch (err: any) {
      return { success: false, error: toFriendlyGithubError(err) };
    }
  });

  // GitHub: Upload Release Asset
  ipcMain.handle('github:uploadReleaseAsset', async (event, owner, repo, releaseId, filePath, name) => {
    try {
      const token = getDecryptedToken();
      if (!token) throw new Error('Not connected to GitHub');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      const fileSize = fs.statSync(filePath).size;
      const fileData = fs.readFileSync(filePath);
      
      const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Flux-Tasks-App',
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(fileSize)
        },
        body: fileData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }
      
      const asset = await response.json();
      return { success: true, asset };
    } catch (err: any) {
      return { success: false, error: toFriendlyGithubError(err) };
    }
  });

  // Git: Local Git Status
  ipcMain.handle('git:getStatus', async (event, localPath) => {
    try {
      const repository = await inspectLocalRepository(localPath);

      let lastCommit = null;
      if (repository.hasCommits) {
        const output = await runGitCommand(localPath, ['log', '-1', '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s']);
        const [hash, shortHash, author, date, message] = output.trim().split('\x1f');
        lastCommit = { hash, shortHash, author, date, message };
      }
      
      const statusOutput = await runGitCommand(localPath, ['status', '--porcelain=v1']);
      
      const lines = statusOutput.split('\n').filter(Boolean);
      const untracked: string[] = [];
      const changed: string[] = [];
      const staged: string[] = [];
      
      for (const line of lines) {
        const code = line.slice(0, 2);
        const file = line.slice(3).trim();
        
        if (code === '??') {
          untracked.push(file);
        } else {
          const indexStatus = code[0];
          const workTreeStatus = code[1];
          
          if (indexStatus !== ' ' && indexStatus !== '?') {
            staged.push(file);
          }
          if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
            changed.push(file);
          }
        }
      }

      let upstream = '';
      let ahead = 0;
      let behind = 0;
      let lastPush = null;
      if (repository.hasCommits && repository.branch) {
        try {
          upstream = (await runGitCommand(localPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).trim();
          const counts = (await runGitCommand(localPath, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`])).trim().split(/\s+/);
          behind = Number(counts[0] || 0);
          ahead = Number(counts[1] || 0);
          const pushed = await runGitCommand(localPath, ['log', '-1', '--format=%aI%x1f%s', upstream]);
          const [date, message] = pushed.trim().split('\x1f');
          lastPush = { date, message };
        } catch {
          upstream = '';
        }
      }
      
      return {
        success: true,
        status: {
          branch: repository.branch,
          hasCommits: repository.hasCommits,
          lastCommit,
          lastPush,
          remoteUrl: repository.remoteUrl,
          hasOrigin: repository.hasOrigin,
          upstream,
          ahead,
          behind,
          untracked,
          changed,
          staged,
          changedCount: new Set([...changed, ...staged]).size,
          untrackedCount: untracked.length
        }
      };
    } catch (err: any) {
      const message = err?.message === 'LOCAL_PATH_MISSING'
        ? 'Папка локального репозитория не найдена.'
        : err?.message || toFriendlyGitError(err, 'status');
      return { success: false, error: message };
    }
  });

  ipcMain.handle('git:getCommits', async (event, localPath, limit = 30) => {
    try {
      const repository = await inspectLocalRepository(localPath);
      if (!repository.hasCommits) return { success: true, commits: [] };

      const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
      const output = await runGitCommand(localPath, [
        'log',
        `-${safeLimit}`,
        '--date=iso-strict',
        '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e'
      ]);
      const commits = output
        .split('\x1e')
        .map(record => record.trim())
        .filter(Boolean)
        .map(record => {
          const [hash, shortHash, author, date, message] = record.split('\x1f');
          return { hash, shortHash, author, date, message };
        });
      return { success: true, commits };
    } catch (err: any) {
      return { success: false, error: err?.message || toFriendlyGitError(err, 'status') };
    }
  });

  ipcMain.handle('git:getTags', async (event, localPath) => {
    try {
      await inspectLocalRepository(localPath);
      const output = await runGitCommand(localPath, [
        'for-each-ref',
        '--sort=-creatordate',
        '--format=%(refname:short)\t%(creatordate:iso-strict)\t%(subject)',
        'refs/tags'
      ]);
      const tags = output
        .split('\n')
        .map(record => record.trim())
        .filter(Boolean)
        .map(record => {
          const [name, date, message] = record.split('\t');
          return { name, date, message };
        });
      return { success: true, tags };
    } catch (err: any) {
      return { success: false, error: err?.message || toFriendlyGitError(err, 'status') };
    }
  });

  ipcMain.handle('git:validateRelease', async (event, localPath, tagName) => {
    try {
      const normalizedTag = String(tagName || '').trim();
      if (!normalizedTag) return { success: false, error: 'Введите имя тега.' };

      const repository = await inspectLocalRepository(localPath);
      if (!repository.hasCommits) return { success: false, error: 'В репозитории пока нет коммитов.' };
      if (!repository.branch) return { success: false, error: 'Текущая ветка не найдена.' };
      if (!repository.hasOrigin) {
        return {
          success: false,
          error: 'Репозиторий GitHub не подключён.\n\nПодключите remote origin перед публикацией релиза.'
        };
      }

      try {
        await runGitCommand(localPath, ['check-ref-format', `refs/tags/${normalizedTag}`]);
      } catch {
        return { success: false, error: 'Имя тега содержит недопустимые символы.' };
      }

      if (await tagExists(localPath, normalizedTag)) {
        return { success: false, error: 'Тег уже существует.' };
      }

      return { success: true, repository };
    } catch (err: any) {
      return { success: false, error: err?.message || toFriendlyGitError(err, 'repository') };
    }
  });

  // Git: Local Pull
  ipcMain.handle('git:pull', async (event, localPath) => {
    try {
      const repository = await inspectLocalRepository(localPath);
      if (!repository.hasOrigin) return { success: false, error: 'Remote origin не настроен.' };
      if (!repository.branch) return { success: false, error: 'Текущая ветка не найдена.' };
      const output = await runGitCommand(localPath, ['pull', '--ff-only', 'origin', repository.branch]);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: toFriendlyGitError(err, 'pull') };
    }
  });

  // Git: Local Push
  ipcMain.handle('git:push', async (event, localPath) => {
    try {
      const repository = await inspectLocalRepository(localPath);
      if (!repository.hasCommits) return { success: false, error: 'В репозитории пока нет коммитов.' };
      if (!repository.hasOrigin) return { success: false, error: 'Remote origin не настроен.' };
      if (!repository.branch) return { success: false, error: 'Текущая ветка не найдена.' };
      const output = await runGitCommand(localPath, ['push', '-u', 'origin', repository.branch]);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: toFriendlyGitError(err, 'push') };
    }
  });

  // Git: Local Commit
  ipcMain.handle('git:commit', async (event, localPath, message) => {
    try {
      const normalizedMessage = String(message || '').trim();
      if (!normalizedMessage) return { success: false, error: 'Введите сообщение коммита.' };
      await inspectLocalRepository(localPath);

      const status = (await runGitCommand(localPath, ['status', '--porcelain=v1'])).trim();
      if (!status) return { success: false, error: 'Нет изменений для коммита.' };

      const settings = loadSettings();
      if (settings['gitUsername']) {
        await runGitCommand(localPath, ['config', 'user.name', settings['gitUsername']]);
      }
      if (settings['gitEmail']) {
        await runGitCommand(localPath, ['config', 'user.email', settings['gitEmail']]);
      }
      await runGitCommand(localPath, ['add', '-A']);
      const output = await runGitCommand(localPath, ['commit', '-m', normalizedMessage]);
      const commit = (await runGitCommand(localPath, ['log', '-1', '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s'])).trim();
      const [hash, shortHash, author, date, commitMessage] = commit.split('\x1f');
      return { success: true, output, commit: { hash, shortHash, author, date, message: commitMessage } };
    } catch (err: any) {
      return { success: false, error: toFriendlyGitError(err, 'commit') };
    }
  });

  // Git: Local Tag
  ipcMain.handle('git:tag', async (event, localPath, tagName, message) => {
    try {
      const normalizedTag = String(tagName || '').trim();
      const validation = await inspectLocalRepository(localPath);
      if (!normalizedTag) return { success: false, error: 'Введите имя тега.' };
      if (!validation.hasCommits) return { success: false, error: 'В репозитории пока нет коммитов.' };
      try {
        await runGitCommand(localPath, ['check-ref-format', `refs/tags/${normalizedTag}`]);
      } catch {
        return { success: false, error: 'Имя тега содержит недопустимые символы.' };
      }
      if (await tagExists(localPath, normalizedTag)) {
        return { success: false, error: 'Тег уже существует.' };
      }

      const tagMessage = String(message || '').trim() || normalizedTag;
      const output = await runGitCommand(localPath, ['tag', '-a', normalizedTag, '-m', tagMessage]);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: toFriendlyGitError(err, 'tag') };
    }
  });

  // Git: Push Tag
  ipcMain.handle('git:pushTag', async (event, localPath, tagName) => {
    try {
      const normalizedTag = String(tagName || '').trim();
      const repository = await inspectLocalRepository(localPath);
      if (!repository.hasOrigin) {
        return {
          success: false,
          error: 'Репозиторий GitHub не подключён.\n\nПодключите remote origin перед публикацией релиза.'
        };
      }
      if (!(await tagExists(localPath, normalizedTag))) {
        return { success: false, error: 'Локальный тег не найден.' };
      }

      const ref = `refs/tags/${normalizedTag}`;
      const output = await runGitCommand(localPath, ['push', 'origin', `${ref}:${ref}`]);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: toFriendlyGitError(err, 'pushTag') };
    }
  });

  // Git: Copy File to Project Folder
  ipcMain.handle('git:copyFile', async (event, sourcePath, destDirectory) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: `Source file does not exist: ${sourcePath}` };
      }
      if (!fs.existsSync(destDirectory)) {
        return { success: false, error: `Destination directory does not exist: ${destDirectory}` };
      }
      const fileName = path.basename(sourcePath);
      const destPath = path.join(destDirectory, fileName);
      fs.copyFileSync(sourcePath, destPath);
      return { success: true, destPath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Open Folder in Explorer
  ipcMain.handle('git:openFolder', async (event, localPath) => {
    try {
      if (!fs.existsSync(localPath)) {
        return { success: false, error: 'Path does not exist.' };
      }
      await shell.openPath(localPath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Open terminal in directory
  ipcMain.handle('git:openTerminal', async (event, localPath) => {
    try {
      if (!fs.existsSync(localPath)) {
        return { success: false, error: 'Path does not exist.' };
      }
      spawn('cmd.exe', ['/c', 'start', 'powershell.exe'], { cwd: localPath, detached: true, stdio: 'ignore' });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

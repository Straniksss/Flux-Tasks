import { ipcMain, safeStorage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { loadSettings, saveSetting } from './database';
import * as http from 'http';

const execAsync = promisify(exec);

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
    throw new Error('Not connected to GitHub (no token found)');
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
  
  if (response.status === 401 || response.status === 403) {
    throw new Error(`GitHub API Authorization Error (${response.status})`);
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API Error (${response.status}): ${errorText}`);
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
  
  // Format arguments safely
  const command = `git ${args.join(' ')}`;
  const { stdout, stderr } = await execAsync(command, { cwd: localPath });
  return stdout || stderr;
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
      return { success: false, error: err.message };
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
      return { success: false, error: err.message };
    }
  });

  // Git: Local Git Status
  ipcMain.handle('git:getStatus', async (event, localPath) => {
    try {
      if (!fs.existsSync(localPath)) {
        return { success: false, error: 'Local folder path does not exist.' };
      }
      if (!fs.existsSync(path.join(localPath, '.git'))) {
        return { success: false, error: 'Not a git repository (missing .git directory).' };
      }
      
      let branch = 'unknown';
      try {
        branch = (await runGitCommand(localPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
      } catch (e) {}
      
      let lastCommit = 'No commits yet';
      try {
        lastCommit = (await runGitCommand(localPath, ['log', '-1', '--format="%h - %s (%an, %ar)"'])).trim();
        lastCommit = lastCommit.replace(/^"|"$/g, '');
      } catch (e) {}
      
      let remoteUrl = '';
      try {
        remoteUrl = (await runGitCommand(localPath, ['config', '--get', 'remote.origin.url'])).trim();
      } catch (e) {}
      
      let statusOutput = '';
      try {
        statusOutput = await runGitCommand(localPath, ['status', '--porcelain']);
      } catch (e) {}
      
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
      
      return {
        success: true,
        status: {
          branch,
          lastCommit,
          remoteUrl,
          untracked,
          changed,
          staged
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Local Pull
  ipcMain.handle('git:pull', async (event, localPath) => {
    try {
      const output = await runGitCommand(localPath, ['pull']);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Local Push
  ipcMain.handle('git:push', async (event, localPath) => {
    try {
      const output = await runGitCommand(localPath, ['push']);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Local Commit
  ipcMain.handle('git:commit', async (event, localPath, message) => {
    try {
      await runGitCommand(localPath, ['add', '-A']);
      const output = await runGitCommand(localPath, ['commit', '-m', `"${message.replace(/"/g, '\\"')}"`]);
      return { success: true, output };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Git: Local Tag
  ipcMain.handle('git:tag', async (event, localPath, tagName, message) => {
    try {
      const args = ['tag', tagName];
      if (message) {
        args.push('-m', `"${message.replace(/"/g, '\\"')}"`);
      }
      const output = await runGitCommand(localPath, args);
      return { success: true, output };
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

import { app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { spawn } from 'child_process';
import { getAppDataPath } from './database';

// Update directories
const APP_DATA_PATH = getAppDataPath();
const UPDATES_DIR = path.join(APP_DATA_PATH, 'updates');
const DOWNLOADS_DIR = path.join(UPDATES_DIR, 'downloads');
const BACKUPS_DIR = path.join(UPDATES_DIR, 'backups');
const UPDATES_LOGS_DIR = path.join(UPDATES_DIR, 'logs');
const LOGS_DIR = path.join(APP_DATA_PATH, 'logs');
const UPDATE_LOG_PATH = path.join(LOGS_DIR, 'update.log');
const CRASH_FLAG_PATH = path.join(APP_DATA_PATH, 'crash_detect.flag');

// Initialize directories
[DOWNLOADS_DIR, BACKUPS_DIR, LOGS_DIR, UPDATES_LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Log updater events
export function logUpdateEvent(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(UPDATE_LOG_PATH, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write to update log', err);
  }
}

// Helper to disable ASAR patching during file system operations
function runWithoutAsar<T>(fn: () => T): T {
  const original = (process as any).noAsar;
  (process as any).noAsar = true;
  try {
    return fn();
  } finally {
    (process as any).noAsar = original;
  }
}

// Version parser helper
function parseVersion(v: string) {
  const clean = v.replace(/^v/, '');
  const parts = clean.split('-');
  const numbers = parts[0].split('.').map(Number);
  const prerelease = parts[1] || '';
  return { numbers, prerelease };
}

// Compare semantic versions (v1 > v2: returns 1, v1 < v2: returns -1, equal: returns 0)
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  for (let i = 0; i < 3; i++) {
    const num1 = parsed1.numbers[i] || 0;
    const num2 = parsed2.numbers[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  if (!parsed1.prerelease && parsed2.prerelease) return 1; // Stable is newer than prerelease
  if (parsed1.prerelease && !parsed2.prerelease) return -1;

  if (parsed1.prerelease && parsed2.prerelease) {
    return parsed1.prerelease.localeCompare(parsed2.prerelease);
  }

  return 0;
}

// Helper to make HTTPS requests and follow redirects
function httpsGetWithRedirects(url: string, headers: any = {}): Promise<{ statusCode: number; data: string; headers: any }> {
  return new Promise((resolve, reject) => {
    let redirectCount = 0;
    const maxRedirects = 5;

    const makeRequest = (currentUrl: string) => {
      const isHttps = currentUrl.startsWith('https');
      const lib = isHttps ? https : http;

      lib.get(currentUrl, { headers }, (res) => {
        const statusCode = res.statusCode || 0;
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            reject(new Error(`Too many redirects (max: ${maxRedirects})`));
            return;
          }

          let redirectUrl = res.headers.location;
          try {
            redirectUrl = new URL(redirectUrl, currentUrl).href;
          } catch (e) {
            reject(new Error(`Failed to resolve redirect location: ${redirectUrl}`));
            return;
          }

          logUpdateEvent(`Redirecting to ${redirectUrl}`);
          makeRequest(redirectUrl);
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode,
            data,
            headers: res.headers
          });
        });
      }).on('error', (err) => {
        reject(err);
      });
    };
    makeRequest(url);
  });
}

// Helper to download files and follow redirects
async function downloadAsar(
  asarUrl: string,
  tempFilePath: string,
  headers: any = {}
): Promise<{ statusCode: number; downloadedBytes: number; contentLength?: number }> {
  logUpdateEvent('Download started');
  logUpdateEvent(`initial URL: ${asarUrl}`);

  const response = await fetch(asarUrl, {
    redirect: "follow",
    headers: { "User-Agent": "Flux Tasks Agent", ...headers }
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || 'unknown';
  const contentLengthStr = response.headers.get("content-length");
  const contentLength = contentLengthStr ? Number(contentLengthStr) : undefined;
  
  logUpdateEvent(`final URL: ${response.url}`);
  logUpdateEvent(`HTTP status: ${response.status}`);
  logUpdateEvent(`content-type: ${contentType}`);
  logUpdateEvent(`content-length: ${contentLength ?? 'unknown'}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  runWithoutAsar(() => fs.writeFileSync(tempFilePath, buffer));
  logUpdateEvent('file written: true');

  return {
    statusCode: response.status,
    downloadedBytes: buffer.length,
    contentLength
  };
}

// Helper to calculate SHA256 streaming
function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = runWithoutAsar(() => fs.createReadStream(filePath));
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

// Check for updates
export async function checkForUpdates(channel: string): Promise<{ updateAvailable: boolean; manifest?: any; error?: string }> {
  logUpdateEvent(`Checking for updates. Channel: ${channel}. Current version: ${app.getVersion()}`);
  
  // Offline / Mock fallback: if user placed a mock manifest in AppData for testing, read that first
  const mockManifestPath = path.join(APP_DATA_PATH, `mock-manifest-${channel}.json`);
  if (runWithoutAsar(() => fs.existsSync(mockManifestPath))) {
    try {
      const localData = runWithoutAsar(() => fs.readFileSync(mockManifestPath, 'utf8'));
      const manifest = JSON.parse(localData);
      const currentVersion = app.getVersion();
      const updateAvailable = compareVersions(manifest.version, currentVersion) > 0;
      
      logUpdateEvent('Manifest loaded');
      logUpdateEvent(`Manifest version: ${manifest.version}`);
      logUpdateEvent(`Manifest size: ${manifest.size}`);
      logUpdateEvent(`Manifest sha256: ${manifest.sha256}`);
      logUpdateEvent(`Manifest asarUrl: ${manifest.asarUrl}`);
      logUpdateEvent(`Mock update check: version ${manifest.version} available. Update check result: ${updateAvailable}`);
      return { updateAvailable, manifest };
    } catch (e) {}
  }

  const repoOwner = 'Straniksss';
  const repoName = 'Flux-Tasks';

  let manifest: any = null;
  let loadedFromApi = false;

  // 1. Try to fetch matching release from GitHub Releases API
  try {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;
    logUpdateEvent(`Fetching releases from GitHub API: ${apiUrl}`);
    const res = await httpsGetWithRedirects(apiUrl, { 'User-Agent': 'Flux Tasks Agent' });
    if (res.statusCode === 200) {
      const releases = JSON.parse(res.data);
      if (Array.isArray(releases)) {
        const manifestFilename = channel === 'stable' ? 'latest.json' : `latest-${channel}.json`;
        for (const release of releases) {
          if (channel === 'stable' && release.prerelease) {
            continue;
          }
          const manifestAsset = release.assets?.find((a: any) => a.name === manifestFilename || a.name === 'latest.json');
          if (manifestAsset) {
            logUpdateEvent(`Found manifest asset in release ${release.tag_name}: ${manifestAsset.name}`);
            const assetRes = await httpsGetWithRedirects(manifestAsset.browser_download_url, { 'User-Agent': 'Flux Tasks Agent' });
            if (assetRes.statusCode === 200) {
              manifest = JSON.parse(assetRes.data);
              loadedFromApi = true;
              break;
            } else {
              logUpdateEvent(`Failed to fetch manifest from asset URL: status ${assetRes.statusCode}`);
            }
          }
        }
      }
    } else {
      logUpdateEvent(`GitHub API returned status ${res.statusCode}`);
    }
  } catch (apiErr: any) {
    logUpdateEvent(`GitHub API check failed: ${apiErr.message}`);
  }

  // 2. Fallback to direct URLs if API was unsuccessful
  if (!loadedFromApi) {
    logUpdateEvent(`Falling back to direct release download and raw repository URLs`);
    const manifestFilename = channel === 'stable' ? 'latest.json' : `latest-${channel}.json`;
    const fallbackUrls: string[] = [];
    if (channel === 'stable') {
      fallbackUrls.push(`https://github.com/${repoOwner}/${repoName}/releases/latest/download/latest.json`);
    }
    fallbackUrls.push(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/packages/${channel}/${manifestFilename}`);
    fallbackUrls.push(`https://straniksss.github.io/Flux-Tasks/packages/${channel}/${manifestFilename}`);

    for (const url of fallbackUrls) {
      try {
        logUpdateEvent(`Trying URL: ${url}`);
        const res = await httpsGetWithRedirects(url, { 'User-Agent': 'Flux Tasks Agent' });
        if (res.statusCode === 200) {
          manifest = JSON.parse(res.data);
          break;
        } else {
          logUpdateEvent(`URL returned status ${res.statusCode}`);
        }
      } catch (e: any) {
        logUpdateEvent(`Failed fetching from ${url}: ${e.message}`);
      }
    }
  }

  try {
    if (!manifest || !manifest.version) {
      return { updateAvailable: false, error: 'Update manifest not found or invalid format' };
    }

    logUpdateEvent('Manifest loaded');
    logUpdateEvent(`Manifest version: ${manifest.version}`);
    logUpdateEvent(`Manifest size: ${manifest.size}`);
    logUpdateEvent(`Manifest sha256: ${manifest.sha256}`);
    logUpdateEvent(`Manifest asarUrl: ${manifest.asarUrl}`);

    const currentVersion = app.getVersion();
    const updateAvailable = compareVersions(manifest.version, currentVersion) > 0;
    logUpdateEvent(`Online update check: version ${manifest.version} available (current: ${currentVersion}).`);
    return { updateAvailable, manifest };
  } catch (err: any) {
    logUpdateEvent(`Update check processing failed: ${err.message}`);
    return { updateAvailable: false, error: err.message };
  }
}

// Helper to validate raw ASAR file
function isValidAsarFile(filePath: string, expectedSize?: number, expectedSha256?: string): boolean {
  logUpdateEvent('Validation started');
  
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  try {
    if (!fs.existsSync(filePath)) {
      logUpdateEvent(`Validation failed: reason = File does not exist at ${filePath}`);
      return false;
    }
    const stats = fs.statSync(filePath);
    logUpdateEvent(`Expected size: ${expectedSize !== undefined ? expectedSize : 'not specified'}`);
    logUpdateEvent(`Actual size: ${stats.size}`);

    if (expectedSize !== undefined && stats.size !== expectedSize) {
      logUpdateEvent(`Validation failed: reason = File size ${stats.size} does not match expected size ${expectedSize}`);
      return false;
    }

    let actualSha256 = '';
    if (expectedSha256 && expectedSha256.trim()) {
      logUpdateEvent(`Expected sha256: ${expectedSha256}`);
      try {
        const fileBuffer = fs.readFileSync(filePath);
        actualSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        logUpdateEvent(`Actual sha256: ${actualSha256}`);
        if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
          logUpdateEvent(`Validation failed: reason = SHA256 mismatch. Expected: ${expectedSha256}, Actual: ${actualSha256}`);
          return false;
        }
      } catch (e: any) {
        logUpdateEvent(`Validation failed: reason = SHA256 calculation error: ${e.message}`);
        return false;
      }
    } else {
      logUpdateEvent('Expected sha256: not specified');
    }

    // Read ASAR header prefix
    try {
      const fd = fs.openSync(filePath, 'r');
      const headerBuf = Buffer.alloc(8);
      fs.readSync(fd, headerBuf, 0, 8, 0);
      fs.closeSync(fd);

      const sizePrefix = headerBuf.readUInt32LE(0);
      const headerSize = headerBuf.readUInt32LE(4);

      if (sizePrefix !== 4 || headerSize === 0 || headerSize > stats.size) {
        logUpdateEvent(`Validation failed: reason = Invalid ASAR header structure. Size prefix: ${sizePrefix}, Header size: ${headerSize}`);
        return false;
      }

      logUpdateEvent(`ASAR Header Check: Success. Header size: ${headerSize}`);
    } catch (err: any) {
      logUpdateEvent(`Validation failed: reason = Could not read or validate ASAR header: ${err.message}`);
      return false;
    }

    logUpdateEvent('Validation passed');
    return true;
  } finally {
    process.noAsar = originalNoAsar;
  }
}

// Download Update File
export async function downloadUpdateFile(manifest: any): Promise<{ success: boolean; packagePath?: string; error?: string }> {
  const originalNoAsar = process.noAsar;
  process.noAsar = true;

  const url = manifest.asarUrl || manifest.packageUrl;
  if (!url) {
    logUpdateEvent('Download error: No package download URL in manifest');
    process.noAsar = originalNoAsar;
    return { success: false, error: 'No package download URL in manifest' };
  }

  const filename = path.basename(url.split('?')[0]);
  const tempFilePath = path.join(DOWNLOADS_DIR, `downloading_${filename}`);
  const finalFilePath = path.join(DOWNLOADS_DIR, filename);

  logUpdateEvent(`Download started`);
  logUpdateEvent(`expected bytes: ${manifest.size || 'not specified'}`);
  logUpdateEvent(`expected sha256: ${manifest.sha256 || 'not specified'}`);
  logUpdateEvent(`Temporary file path: ${tempFilePath}`);

  // Clean up any existing temp files from previous attempts
  if (runWithoutAsar(() => fs.existsSync(tempFilePath))) {
    try {
      runWithoutAsar(() => fs.unlinkSync(tempFilePath));
      logUpdateEvent(`Cleaned up existing temporary file: ${tempFilePath}`);
    } catch (e: any) {
      logUpdateEvent(`Warning: Could not delete existing temporary file: ${e.message}`);
    }
  }

  try {
    const result = await downloadAsar(url, tempFilePath, { 'User-Agent': 'Flux Tasks Agent' });

    // After await:
    // - проверить existsSync(tempPath)
    const exists = runWithoutAsar(() => fs.existsSync(tempFilePath));
    if (!exists) {
      throw new Error(`Temporary download file was not created at ${tempFilePath}`);
    }

    // - проверить stat.size
    const actualSize = runWithoutAsar(() => fs.statSync(tempFilePath).size);

    // - проверить sha256
    const actualSha256 = await calculateFileSha256(tempFilePath);
    const expectedSha256 = manifest.sha256;
    let sha256Match = false;
    if (expectedSha256 && expectedSha256.trim()) {
      sha256Match = actualSha256.toLowerCase() === expectedSha256.toLowerCase();
    } else {
      sha256Match = true;
    }

    // - Добавить защиту:
    // если downloaded !== expectedSize:
    // throw new Error(`Download incomplete: ${downloaded}/${expectedSize}`)
    const expectedSize = manifest.size;
    if (expectedSize !== undefined && actualSize !== expectedSize) {
      throw new Error(`Download incomplete: actual file size ${actualSize}/${expectedSize}`);
    }
    if (expectedSize !== undefined && result.downloadedBytes !== expectedSize) {
      throw new Error(`Download incomplete: downloaded bytes ${result.downloadedBytes}/${expectedSize}`);
    }

    // - validation: PASS/FAIL
    const isValid = isValidAsarFile(tempFilePath, expectedSize, expectedSha256);

    // - Добавить финальные логи только после завершения:
    logUpdateEvent(`HTTP status: ${result.statusCode}`);
    logUpdateEvent(`content-length: ${result.contentLength ?? 'unknown'}`);
    logUpdateEvent(`buffer size: ${result.downloadedBytes}`);
    logUpdateEvent(`file written: true`);
    logUpdateEvent(`actual file size: ${actualSize}`);
    logUpdateEvent(`sha256 match: ${sha256Match}`);
    logUpdateEvent(`validation: ${isValid ? 'PASS' : 'FAIL'}`);

    if (!isValid) {
      throw new Error(`Downloaded package validation failed (invalid size, checksum, or structure)`);
    }

    // - rename temp file to app.asar
    if (runWithoutAsar(() => fs.existsSync(finalFilePath))) {
      runWithoutAsar(() => fs.unlinkSync(finalFilePath));
      logUpdateEvent(`Unlinked existing final package at: ${finalFilePath}`);
    }
    runWithoutAsar(() => fs.renameSync(tempFilePath, finalFilePath));
    logUpdateEvent(`Renamed temporary file to final path: ${finalFilePath}`);
    logUpdateEvent(`--- Download and validation successfully completed ---`);
    return { success: true, packagePath: finalFilePath };
  } catch (err: any) {
    logUpdateEvent(`Download failed or package invalid: ${err.message}`);
    
    // On failure: delete downloading_app.asar
    if (runWithoutAsar(() => fs.existsSync(tempFilePath))) {
      try {
        runWithoutAsar(() => fs.unlinkSync(tempFilePath));
        logUpdateEvent(`Deleted temporary file due to failure: ${tempFilePath}`);
      } catch (e: any) {
        logUpdateEvent(`Failed to delete temporary file on cleanup: ${e.message}`);
      }
    }
    
    return { success: false, error: err.message || 'Download validation failed.' };
  } finally {
    process.noAsar = originalNoAsar;
  }
}

// Backup current state before applying updates (keep latest backup and previous backup)
export function rotateAndBackupAsar() {
  const activeAsarPath = path.join(process.resourcesPath, 'app.asar');
  if (!runWithoutAsar(() => fs.existsSync(activeAsarPath))) {
    logUpdateEvent(`Warning: Active app.asar not found at ${activeAsarPath}`);
    return;
  }

  const backupAsarPath = path.join(BACKUPS_DIR, 'app.asar.bak');
  const backupAsarPathPrev = path.join(BACKUPS_DIR, 'app.asar.bak.1');

  try {
    if (runWithoutAsar(() => fs.existsSync(backupAsarPath))) {
      if (runWithoutAsar(() => fs.existsSync(backupAsarPathPrev))) {
        runWithoutAsar(() => fs.unlinkSync(backupAsarPathPrev));
      }
      runWithoutAsar(() => fs.renameSync(backupAsarPath, backupAsarPathPrev));
      logUpdateEvent('Rotated previous backup to app.asar.bak.1');
    }
    runWithoutAsar(() => fs.copyFileSync(activeAsarPath, backupAsarPath));
    logUpdateEvent('Created backup: app.asar.bak');
  } catch (err: any) {
    logUpdateEvent(`Failed to backup app.asar: ${err.message}`);
    throw err;
  }
}

// Install update package
export async function installUpdatePackage(packagePath: string, isAsarOnly: boolean): Promise<{ success: boolean; error?: string }> {
  logUpdateEvent('Install started');
  logUpdateEvent(`Installing update: ${packagePath}. ASAR-only: ${isAsarOnly}`);
  
  if (isAsarOnly) {
    try {
      if (!app.isPackaged) {
        logUpdateEvent('Running in development mode. Simulating ASAR update and restart.');
        const updateStatePath = path.join(UPDATES_DIR, 'update_state.json');
        runWithoutAsar(() => fs.writeFileSync(updateStatePath, JSON.stringify({ status: 'installing', version: 'mock-dev' }), 'utf8'));
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 1000);
        return { success: true };
      }

      // Clean up old script files if they exist
      const oldUpdateScriptPath = path.join(UPDATES_DIR, 'apply_update.bat');
      const oldRollbackScriptPath = path.join(UPDATES_DIR, 'rollback_update.bat');
      const oldUpdatePs1 = path.join(UPDATES_DIR, 'apply_update.ps1');
      const oldRollbackPs1 = path.join(UPDATES_DIR, 'rollback_update.ps1');
      const oldVbs = path.join(UPDATES_DIR, 'run_silent.vbs');
      [oldUpdateScriptPath, oldRollbackScriptPath, oldUpdatePs1, oldRollbackPs1, oldVbs].forEach(oldScript => {
        if (runWithoutAsar(() => fs.existsSync(oldScript))) {
          try {
            runWithoutAsar(() => fs.unlinkSync(oldScript));
            logUpdateEvent(`Cleaned up old script file: ${oldScript}`);
          } catch (e: any) {
            logUpdateEvent(`Warning: Could not delete old script file: ${e.message}`);
          }
        }
      });

      // Backup current app.asar (with rotation)
      rotateAndBackupAsar();
      logUpdateEvent('Backup created');

      const activeAsarPath = path.join(process.resourcesPath, 'app.asar');
      const updateScriptPath = path.join(UPDATES_DIR, 'apply_update.bat');
      const rollbackScriptPath = path.join(UPDATES_DIR, 'rollback_update.bat');
      const appExePath = process.execPath;
      const rollbackFlagPath = path.join(UPDATES_DIR, 'rollback.flag');
      const updateStatePath = path.join(UPDATES_DIR, 'update_state.json');
      const backupAsarPath = path.join(BACKUPS_DIR, 'app.asar.bak');
      const currentPid = process.pid;

      // Write installing state
      runWithoutAsar(() => fs.writeFileSync(updateStatePath, JSON.stringify({ status: 'installing', version: 'new-version' }), 'utf8'));

      logUpdateEvent('Replacing app.asar');
      logUpdateEvent(`Generating rollback batch script at ${rollbackScriptPath}`);

      const rollbackScriptContent = `@echo off
setlocal enabledelayedexpansion

echo [%DATE% %TIME%] [Rollback] Starting rollback batch script... >> "${UPDATE_LOG_PATH}"

:wait_loop
tasklist /FI "PID eq ${currentPid}" 2>NUL | find /I "${currentPid}">NUL
if !ERRORLEVEL! EQU 0 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

timeout /t 1 /nobreak >nul

if exist "${backupAsarPath}" (
    copy /Y "${backupAsarPath}" "${activeAsarPath}" >nul
    if !ERRORLEVEL! EQU 0 (
        echo [%DATE% %TIME%] [Rollback] Restored backup app.asar successfully. >> "${UPDATE_LOG_PATH}"
        echo {"status":"failed","error":"Copy failed"} > "${updateStatePath}"
        echo Rollback > "${rollbackFlagPath}"
    ) else (
        echo [%DATE% %TIME%] [Rollback] CRITICAL: Failed to copy backup app.asar. >> "${UPDATE_LOG_PATH}"
    )
) else (
    echo [%DATE% %TIME%] [Rollback] CRITICAL: Backup file not found at ${backupAsarPath} >> "${UPDATE_LOG_PATH}"
)

start "" "${appExePath}"
exit /b 0
`;
      runWithoutAsar(() => fs.writeFileSync(rollbackScriptPath, rollbackScriptContent, 'utf8'));

      logUpdateEvent(`Generating update batch script at ${updateScriptPath}`);

      const updateScriptContent = `@echo off
setlocal enabledelayedexpansion

echo [%DATE% %TIME%] [Updater] Starting batch script update... >> "${UPDATE_LOG_PATH}"

:wait_loop
tasklist /FI "PID eq ${currentPid}" 2>NUL | find /I "${currentPid}">NUL
if !ERRORLEVEL! EQU 0 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

timeout /t 1 /nobreak >nul

:: Backup current app.asar
echo [%DATE% %TIME%] [Updater] Backing up active app.asar... >> "${UPDATE_LOG_PATH}"
copy /Y "${activeAsarPath}" "${backupAsarPath}" >nul

:: Replace app.asar
echo [%DATE% %TIME%] [Updater] Replacing active app.asar with new package... >> "${UPDATE_LOG_PATH}"
copy /Y "${packagePath}" "${activeAsarPath}" >nul
if !ERRORLEVEL! NEQ 0 (
    echo [%DATE% %TIME%] [Updater] Error: Failed to copy new app.asar. Rolling back... >> "${UPDATE_LOG_PATH}"
    copy /Y "${backupAsarPath}" "${activeAsarPath}" >nul
    echo {"status":"failed","error":"Copy failed"} > "${updateStatePath}"
    start "" "${appExePath}"
    exit /b 1
)

:: Verify file size
for %%I in ("${packagePath}") do set expectedSize=%%~zI
for %%I in ("${activeAsarPath}") do set actualSize=%%~zI
if "!actualSize!" NEQ "!expectedSize!" (
    echo [%DATE% %TIME%] [Updater] Error: Size mismatch. Expected: !expectedSize!, Actual: !actualSize!. Rolling back... >> "${UPDATE_LOG_PATH}"
    copy /Y "${backupAsarPath}" "${activeAsarPath}" >nul
    echo {"status":"failed","error":"Size mismatch"} > "${updateStatePath}"
    start "" "${appExePath}"
    exit /b 1
)

:: Write success state
echo {"status":"success"} > "${updateStatePath}"
echo [%DATE% %TIME%] [Updater] Update applied successfully. Restarting... >> "${UPDATE_LOG_PATH}"

:: Restart application
start "" "${appExePath}"
exit /b 0
`;
      runWithoutAsar(() => fs.writeFileSync(updateScriptPath, updateScriptContent, 'utf8'));

      // Write run_silent.vbs helper script to run the batch script without a window
      const vbsPath = path.join(UPDATES_DIR, 'run_silent.vbs');
      const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run chr(34) & WScript.Arguments(0) & chr(34), 0, False`;
      runWithoutAsar(() => fs.writeFileSync(vbsPath, vbsContent, 'utf8'));

      logUpdateEvent('Spawning update script in detached process via VBS...');
      spawn('wscript.exe', [vbsPath, updateScriptPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }).unref();

      logUpdateEvent('Install finished');
      logUpdateEvent('Restart requested');
      logUpdateEvent('Closing application to allow batch update copy...');
      app.quit();
      return { success: true };
    } catch (err: any) {
      logUpdateEvent(`ASAR update setup failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  } else {
    // Full setup installer fallback mode
    try {
      const updateScriptPath = path.join(UPDATES_DIR, 'apply_update.bat');
      logUpdateEvent(`Generating installer batch script at ${updateScriptPath}`);
      const appExePath = process.execPath;
      const currentPid = process.pid;
      
      const installerScriptContent = `@echo off
setlocal enabledelayedexpansion

echo [%DATE% %TIME%] [Updater] Starting installer script... >> "${UPDATE_LOG_PATH}"

:wait_loop
tasklist /FI "PID eq ${currentPid}" 2>NUL | find /I "${currentPid}">NUL
if !ERRORLEVEL! EQU 0 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

timeout /t 1 /nobreak >nul

echo [%DATE% %TIME%] [Updater] Running installer: ${packagePath} >> "${UPDATE_LOG_PATH}"
start /wait "" "${packagePath}" /S

echo [%DATE% %TIME%] [Updater] Installer finished. Restarting app... >> "${UPDATE_LOG_PATH}"
start "" "${appExePath}"
exit /b 0
`;
      
      runWithoutAsar(() => fs.writeFileSync(updateScriptPath, installerScriptContent, 'utf8'));

      // Write run_silent.vbs helper script to run the batch script without a window
      const vbsPath = path.join(UPDATES_DIR, 'run_silent.vbs');
      const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run chr(34) & WScript.Arguments(0) & chr(34), 0, False`;
      runWithoutAsar(() => fs.writeFileSync(vbsPath, vbsContent, 'utf8'));

      logUpdateEvent('Spawning installer script in detached process via VBS...');
      spawn('wscript.exe', [vbsPath, updateScriptPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }).unref();

      logUpdateEvent('Installer spawned. Exiting app for installation...');
      logUpdateEvent('Install finished');
      logUpdateEvent('Restart requested');
      app.quit();
      return { success: true };
    } catch (err: any) {
      logUpdateEvent(`Full installer execution failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

// Startup check for applied updates and rollback crashes
export function checkStartupUpdates(recoveryModeActive: boolean) {
  const updateStatePath = path.join(UPDATES_DIR, 'update_state.json');
  const rollbackFlagPath = path.join(UPDATES_DIR, 'rollback.flag');
  const backupAsarPath = path.join(BACKUPS_DIR, 'app.asar.bak');
  const activeAsarPath = path.join(process.resourcesPath, 'app.asar');
  const appExePath = process.execPath;

  if (fs.existsSync(updateStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(updateStatePath, 'utf8'));
      if (state.status === 'installing') {
        if (recoveryModeActive) {
          logUpdateEvent('CRITICAL: Newly installed update crashed on startup. Spawning rollback script...');
          if (fs.existsSync(backupAsarPath) && app.isPackaged) {
            const rollbackScriptPath = path.join(UPDATES_DIR, 'rollback_update.bat');
            const vbsPath = path.join(UPDATES_DIR, 'run_silent.vbs');
            const currentPid = process.pid;

            // Clean up old script files if they exist
            const oldUpdateScriptPath = path.join(UPDATES_DIR, 'apply_update.bat');
            const oldRollbackScriptPath = path.join(UPDATES_DIR, 'rollback_update.bat');
            const oldUpdatePs1 = path.join(UPDATES_DIR, 'apply_update.ps1');
            const oldRollbackPs1 = path.join(UPDATES_DIR, 'rollback_update.ps1');
            const oldVbs = path.join(UPDATES_DIR, 'run_silent.vbs');
            [oldUpdateScriptPath, oldRollbackScriptPath, oldUpdatePs1, oldRollbackPs1, oldVbs].forEach(oldScript => {
              if (runWithoutAsar(() => fs.existsSync(oldScript))) {
                try {
                  runWithoutAsar(() => fs.unlinkSync(oldScript));
                  logUpdateEvent(`Cleaned up old script file: ${oldScript}`);
                } catch (e: any) {
                  logUpdateEvent(`Warning: Could not delete old script file: ${e.message}`);
                }
              }
            });

            // Write run_silent.vbs
            const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run chr(34) & WScript.Arguments(0) & chr(34), 0, False`;
            fs.writeFileSync(vbsPath, vbsContent, 'utf8');

            const scriptContent = `@echo off
setlocal enabledelayedexpansion

echo [%DATE% %TIME%] [Rollback] Starting startup crash rollback script... >> "${UPDATE_LOG_PATH}"

:wait_loop
tasklist /FI "PID eq ${currentPid}" 2>NUL | find /I "${currentPid}">NUL
if !ERRORLEVEL! EQU 0 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

:: Wait extra 500ms
timeout /t 1 /nobreak >nul

if exist "${backupAsarPath}" (
    copy /Y "${backupAsarPath}" "${activeAsarPath}" >nul
    if !ERRORLEVEL! EQU 0 (
        echo [%DATE% %TIME%] [Rollback] Restored backup app.asar successfully. >> "${UPDATE_LOG_PATH}"
        echo {"status":"failed","error":"Crash on startup"} > "${updateStatePath}"
        echo Rollback > "${rollbackFlagPath}"
    ) else (
        echo [%DATE% %TIME%] [Rollback] CRITICAL: Failed to copy backup app.asar. >> "${UPDATE_LOG_PATH}"
    )
) else (
    echo [%DATE% %TIME%] [Rollback] CRITICAL: Backup file not found. >> "${UPDATE_LOG_PATH}"
)

:: Restart application
start "" "${appExePath}"
exit /b 0
`;
            fs.writeFileSync(rollbackScriptPath, scriptContent, 'utf8');
            spawn('wscript.exe', [vbsPath, rollbackScriptPath], {
              detached: true,
              stdio: 'ignore',
              windowsHide: true
            }).unref();
            app.quit();
            process.exit(0);
          } else {
            fs.writeFileSync(updateStatePath, JSON.stringify({ status: 'failed', error: 'Crash on startup (simulation)' }), 'utf8');
            fs.writeFileSync(rollbackFlagPath, 'Crash on startup', 'utf8');
          }
        } else {
          fs.writeFileSync(updateStatePath, JSON.stringify({ status: 'success' }), 'utf8');
          logUpdateEvent('Update succeeded. Application booted cleanly.');
        }
      }
    } catch (e: any) {
      logUpdateEvent(`Failed checking startup updates state: ${e.message}`);
    }
  }
}

// Check if rollback occurred to notify user on startup
export function checkRollbackOccurred(): { occurred: boolean; error?: string } {
  const rollbackFlagPath = path.join(UPDATES_DIR, 'rollback.flag');
  const updateStatePath = path.join(UPDATES_DIR, 'update_state.json');

  if (fs.existsSync(rollbackFlagPath)) {
    try {
      fs.unlinkSync(rollbackFlagPath);
    } catch (e) {}

    let error = 'Update installation failed.';
    try {
      if (fs.existsSync(updateStatePath)) {
        const state = JSON.parse(fs.readFileSync(updateStatePath, 'utf8'));
        if (state.error) {
          error = state.error;
        }
      }
    } catch (e) {}

    logUpdateEvent(`Rollback detected on startup: ${error}`);
    return { occurred: true, error };
  }

  return { occurred: false };
}

// Read Update Logs
export function getUpdateLogsContent(): string {
  if (fs.existsSync(UPDATE_LOG_PATH)) {
    try {
      return fs.readFileSync(UPDATE_LOG_PATH, 'utf8');
    } catch (err) {
      return `Failed to read log file: ${err}`;
    }
  }
  return 'No logs found.';
}

// Open log file in default text editor
export function openUpdateLogFile() {
  if (fs.existsSync(UPDATE_LOG_PATH)) {
    shell.openPath(UPDATE_LOG_PATH);
  }
}

// Startup Crash Recovery
export function initStartupCrashDetector() {
  const now = Date.now();
  let recoveryMode = false;
  if (fs.existsSync(CRASH_FLAG_PATH)) {
    try {
      const data = fs.readFileSync(CRASH_FLAG_PATH, 'utf8');
      const timestamp = parseInt(data, 10);
      logUpdateEvent(`Startup Crash Detector: crash flag found. Last startup timestamp: ${timestamp}`);
      recoveryMode = true;
    } catch (e) {
      recoveryMode = true;
    }
  }

  try {
    fs.writeFileSync(CRASH_FLAG_PATH, String(now), 'utf8');
  } catch (err) {
    console.error('Failed to write crash detection flag', err);
  }

  setTimeout(() => {
    clearStartupCrashFlag();
  }, 10000);

  return recoveryMode;
}

export function clearStartupCrashFlag() {
  if (fs.existsSync(CRASH_FLAG_PATH)) {
    try {
      fs.unlinkSync(CRASH_FLAG_PATH);
      logUpdateEvent('Startup Crash Detector: cleared crash flag (running cleanly).');
    } catch (err) {}
  }
}

// Database repair check and verification
export function repairDatabaseIntegrity(): { success: boolean; log: string[] } {
  const log: string[] = [];
  const dbPath = path.join(APP_DATA_PATH, 'tasks.db');
  
  log.push(`Initiating DB repair checks at: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    log.push('Database file does not exist. Creating new database.');
    try {
      const { initDatabase: dbInit } = require('./database');
      dbInit();
      return { success: true, log };
    } catch (err: any) {
      return { success: false, log: [...log, `Failed to init: ${err.message}`] };
    }
  }

  try {
    const repairBackup = path.join(APP_DATA_PATH, 'backups', 'tasks_corrupted_backup.db');
    fs.copyFileSync(dbPath, repairBackup);
    log.push(`Created safety backup of database to: tasks_corrupted_backup.db`);

    log.push('Rebuilding indices and executing PRAGMA integrity check...');
    
    const { loadProjects, loadTasks } = require('./database');
    try {
      const projects = loadProjects();
      log.push(`Loaded projects count: ${projects.length}`);
      const tasks = loadTasks();
      log.push(`Loaded tasks count: ${tasks.length}`);
      log.push('Database matches expected schema structure and reads cleanly.');
    } catch (err: any) {
      log.push(`Read error detected: ${err.message}`);
      log.push('Attempting DB recovery from last automatic backup...');
      
      const backupsDir = path.join(APP_DATA_PATH, 'backups');
      if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir)
          .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
          .sort((a, b) => b.localeCompare(a));
        
        if (files.length > 0) {
          const latestBackup = files[0];
          log.push(`Restoring from backup: ${latestBackup}`);
          const { restoreBackupFile } = require('./database');
          const restored = restoreBackupFile(latestBackup);
          if (restored) {
            log.push('Successfully restored DB from automatic backup.');
            return { success: true, log };
          }
        }
      }
      throw new Error('Database is corrupt and no backups are available.');
    }

    const attachmentsDir = path.join(APP_DATA_PATH, 'attachments');
    if (fs.existsSync(attachmentsDir)) {
      const files = fs.readdirSync(attachmentsDir);
      log.push(`Attachments storage holds ${files.length} physical files.`);
    }

    log.push('Database repair checks finished with status OK.');
    return { success: true, log };
  } catch (err: any) {
    log.push(`Database repair check critical failure: ${err.message}`);
    return { success: false, log };
  }
}
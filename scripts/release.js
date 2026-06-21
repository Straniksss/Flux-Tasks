const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PROJECT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_DIR, 'package.json');
const RELEASE_DIR = path.join(PROJECT_DIR, 'release');

function prompt(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// Расчет контрольной суммы SHA256 файла
function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Вспомогательный метод для запросов к GitHub API
function githubRequest(method, urlPath, token, data, isUpload = false, uploadHost = '') {
  const options = {
    method: method,
    hostname: isUpload ? uploadHost : 'api.github.com',
    path: urlPath,
    headers: {
      'User-Agent': 'Flux Tasks Release Bot',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  if (isUpload) {
    options.headers['Content-Type'] = 'application/octet-stream';
    options.headers['Content-Length'] = data.length;
  } else if (data) {
    options.headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {});
        } else {
          reject(new Error(`GitHub API вернул статус ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Получение списка существующих файлов в релизе
async function getExistingAssets(repoOwner, repoName, releaseId, token) {
  const urlPath = `/repos/${repoOwner}/${repoName}/releases/${releaseId}/assets`;
  return githubRequest('GET', urlPath, token);
}

// Удаление существующего файла из релиза
async function deleteAsset(repoOwner, repoName, assetId, token) {
  const urlPath = `/repos/${repoOwner}/${repoName}/releases/assets/${assetId}`;
  return githubRequest('DELETE', urlPath, token);
}

// Загрузка одного файла с отображением прогресса, тайм-аутом неактивности и повторными попытками
function uploadAssetFile(filePath, uploadUrlRaw, token, maxRetries = 3) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;

  // Парсинг URL загрузки
  const hostMatch = uploadUrlRaw.match(/https:\/\/([^/]+)/);
  const uploadHost = hostMatch ? hostMatch[1] : 'uploads.github.com';
  
  let uploadPath = uploadUrlRaw.replace(/https:\/\/[^/]+/, '').split('{')[0];
  uploadPath = `${uploadPath}?name=${encodeURIComponent(fileName)}`;

  const options = {
    method: 'POST',
    hostname: uploadHost,
    path: uploadPath,
    headers: {
      'User-Agent': 'Flux Tasks Release Bot',
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize
    },
    timeout: 90000 // Тайм-аут неактивности сокета 90 секунд
  };

  const uploadAttempt = (attempt) => {
    return new Promise((resolve, reject) => {
      console.log(`[Попытка ${attempt}/${maxRetries}] Загрузка: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);
      
      const fileStream = fs.createReadStream(filePath, { highWaterMark: 4 * 1024 * 1024 });
      let uploadedBytes = 0;
      let lastPercent = 0;
      let lastLogTime = Date.now();

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`\nФайл ${fileName} успешно загружен!`);
            resolve(body ? JSON.parse(body) : {});
          } else {
            console.error(`\nОшибка загрузки со статусом ${res.statusCode}: ${body}`);
            reject(new Error(`Статус ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('timeout', () => {
        console.error(`\nВремя ожидания загрузки истекло для ${fileName}`);
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.on('error', (err) => {
        console.error(`\nОшибка загрузки ${fileName}: ${err.message}`);
        reject(err);
      });

      fileStream.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const percent = Math.floor((uploadedBytes / fileSize) * 100);
        const now = Date.now();
        // Логирование прогресса каждые 5% или каждую 1 секунду
        if (percent >= lastPercent + 5 || now - lastLogTime >= 1000 || percent === 100) {
          lastPercent = percent;
          lastLogTime = now;
          process.stdout.write(`Загрузка ${fileName}: ${(uploadedBytes / (1024 * 1024)).toFixed(2)} / ${(fileSize / (1024 * 1024)).toFixed(2)} MB (${percent}%)\r`);
        }
      });

      fileStream.on('error', (err) => {
        console.error(`\nОшибка чтения потока для ${filePath}: ${err.message}`);
        req.destroy();
        reject(err);
      });

      fileStream.on('end', () => {
        req.end();
      });

      fileStream.pipe(req);
    });
  };

  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await uploadAttempt(attempt);
        return resolve(result);
      } catch (err) {
        if (attempt === maxRetries) {
          return reject(err);
        }
        console.log(`\nОшибка загрузки. Повторная попытка через 3 секунды...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  });
}

async function startRelease() {
  console.log('=== Автоматизированный конвейер сборки и публикации Flux Tasks ===\n');

  try {
    // 0. Загрузка конфигурации по умолчанию
    let repoOwner = 'Straniksss';
    let repoName = 'Flux-Tasks';
    let token = process.env.GITHUB_TOKEN;

    if (fs.existsSync(path.join(PROJECT_DIR, '.env'))) {
      const dotenvContent = fs.readFileSync(path.join(PROJECT_DIR, '.env'), 'utf8');
      
      const tokenMatch = dotenvContent.match(/GITHUB_TOKEN\s*=\s*([^\r\n]+)/);
      if (tokenMatch) token = tokenMatch[1].trim();

      const ownerMatch = dotenvContent.match(/GITHUB_OWNER\s*=\s*([^\r\n]+)/);
      if (ownerMatch) repoOwner = ownerMatch[1].trim();

      const repoMatch = dotenvContent.match(/GITHUB_REPO\s*=\s*([^\r\n]+)/);
      if (repoMatch) repoName = repoMatch[1].trim();
    }

    // 1. Сбор информации о релизе
    const version = (await prompt('1. Введите целевую версию релиза (например, 1.0.0, 1.1.0-beta.1): ')).trim();
    if (!version) throw new Error('Версия не может быть пустой');

    const channel = (await prompt('2. Введите канал релиза (stable, beta, alpha, rc) [stable]: ')).trim().toLowerCase() || 'stable';
    if (!['stable', 'beta', 'alpha', 'rc'].includes(channel)) {
      throw new Error('Некорректный канал. Допустимые значения: stable, beta, alpha, rc');
    }

    const title = (await prompt(`3. Введите заголовок релиза [Flux Tasks v${version}]: `)).trim() || `Flux Tasks v${version}`;
    const notesInput = await prompt('4. Введите примечания к релизу (список через запятую или одна строка): ');
    const releaseNotes = notesInput.split(',').map(n => n.trim()).filter(Boolean);

    const repoInput = (await prompt(`5. Введите репозиторий GitHub [${repoOwner}/${repoName}]: `)).trim();
    if (repoInput) {
      const parts = repoInput.split('/');
      if (parts.length === 2) {
        repoOwner = parts[0].trim();
        repoName = parts[1].trim();
      } else {
        console.log(`Некорректный формат репозитория. Используем значение по умолчанию: ${repoOwner}/${repoName}`);
      }
    }

    // Получение метаданных репозитория для релиза на GitHub
    const packageDataRaw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    const packageJson = JSON.parse(packageDataRaw);
    
    // Обновление версии в package.json
    packageJson.version = version;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log(`\nВерсия в package.json обновлена до: ${version}`);

    // Коммитим и пушим изменения в репозиторий (package.json)
    console.log('\nВыполнение Git коммита и пуша изменений...');
    try {
      let currentBranch = 'main';
      try {
        currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_DIR }).toString().trim();
      } catch (e) {}

      execSync('git add -A', { stdio: 'inherit', cwd: PROJECT_DIR });
      try {
        execSync(`git commit -m "chore(release): bump version to v${version}"`, { stdio: 'inherit', cwd: PROJECT_DIR });
      } catch (commitErr) {
        console.log('Изменений для коммита не найдено или коммит уже сделан.');
      }
      
      console.log(`Пушим изменения в удаленный репозиторий (ветка: ${currentBranch})...`);
      execSync(`git push origin ${currentBranch}`, { stdio: 'inherit', cwd: PROJECT_DIR });
      console.log('Изменения успешно отправлены на GitHub.');
    } catch (gitErr) {
      console.error('[Предупреждение] Не удалось выполнить git commit/push:', gitErr.message);
    }

    // 2. Скомпилировать и упаковать цели приложения (EXE и ZIP)
    if (process.platform === 'win32') {
      try {
        console.log('Остановка запущенных фоновых процессов Flux Tasks.exe для предотвращения блокировки файлов...');
        execSync('taskkill /f /im "Flux Tasks.exe"', { stdio: 'ignore' });
        // Give OS a split second to release handles
        execSync('timeout /t 1 /nobreak > nul');
      } catch (e) {
        // Игнорируем, если процесс не был запущен
      }
    }
    console.log('\nЗапуск компиляции, сборки фронтенда и упаковки...');
    execSync('npm run package', { stdio: 'inherit', cwd: PROJECT_DIR });

    console.log('Сборка завершена.');

    const asarName = 'app.asar';
    const finalAsarPath = path.join(RELEASE_DIR, asarName);

    // Копирование app.asar из release/win-unpacked/resources/app.asar в release/app.asar
    const sourceAsarPath = path.join(RELEASE_DIR, 'win-unpacked', 'resources', 'app.asar');
    if (!fs.existsSync(sourceAsarPath)) {
      throw new Error(`Не удалось найти скомпилированный app.asar по пути ${sourceAsarPath}`);
    }
    if (fs.existsSync(finalAsarPath)) {
      fs.unlinkSync(finalAsarPath);
    }
    fs.copyFileSync(sourceAsarPath, finalAsarPath);
    console.log(`Скомпилированный app.asar скопирован в: ${finalAsarPath}`);

    // Проверка корректности сгенерированного app.asar
    console.log('\nПроверка корректности сгенерированного app.asar...');
    try {
      execSync(`npx asar list "${finalAsarPath}"`, { stdio: 'ignore' });
      console.log('Проверка успешна: файл app.asar является корректным архивом ASAR.');
    } catch (err) {
      throw new Error(`Сбой проверки архива ASAR: "npx asar list" завершился с ошибкой. Сгенерированный файл app.asar некорректен (MIME type / structure error).`);
    }

    // Расчет размеров и контрольных сумм SHA256
    const asarSize = fs.statSync(finalAsarPath).size;
    const asarSha256 = computeSha256(finalAsarPath);
    console.log(`Размер ASAR: ${asarSize} байт, контрольная сумма SHA256: ${asarSha256}`);

    // 5. Генерация файлов OTA-манифеста
    const setupName = 'Flux Tasks Setup.exe';
    const sourceSetupPath = path.join(RELEASE_DIR, setupName);
    if (!fs.existsSync(sourceSetupPath)) {
      throw new Error(`Не удалось найти скомпилированный установщик по пути ${sourceSetupPath}`);
    }
    const setupSize = fs.statSync(sourceSetupPath).size;
    const setupSha256 = computeSha256(sourceSetupPath);

    const asarUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/v${version}/app.asar`;
    const packageUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/v${version}/Flux%20Tasks%20Setup.exe`;

    const manifest = {
      version: version,
      channel: channel,
      updateType: 'asar',
      asarUrl: asarUrl,
      packageUrl: packageUrl,
      packageSha256: setupSha256,
      packageSize: setupSize,
      sha256: asarSha256,
      size: asarSize,
      releaseNotes: releaseNotes,
      publishedAt: new Date().toISOString()
    };

    const manifestsDir = path.join(RELEASE_DIR, 'manifests');
    if (!fs.existsSync(manifestsDir)) {
      fs.mkdirSync(manifestsDir, { recursive: true });
    }

    // Сохранение манифестов
    const manifestJsonString = JSON.stringify(manifest, null, 2);
    
    // Prerelease versions MUST NOT overwrite stable latest.json
    if (channel === 'stable') {
      fs.writeFileSync(path.join(manifestsDir, 'latest.json'), manifestJsonString, 'utf8');
      fs.writeFileSync(path.join(manifestsDir, 'latest-stable.json'), manifestJsonString, 'utf8');
    } else {
      fs.writeFileSync(path.join(manifestsDir, `latest-${channel}.json`), manifestJsonString, 'utf8');
    }
    console.log('Манифесты OTA-обновления созданы');

    // Копирование файлов в packages/channel/
    const packagesChannelDir = path.join(PROJECT_DIR, 'packages', channel);
    if (!fs.existsSync(packagesChannelDir)) {
      fs.mkdirSync(packagesChannelDir, { recursive: true });
    }

    const manifestFilename = channel === 'stable' ? 'latest.json' : `latest-${channel}.json`;
    fs.writeFileSync(path.join(packagesChannelDir, manifestFilename), manifestJsonString, 'utf8');
    fs.copyFileSync(finalAsarPath, path.join(packagesChannelDir, 'app.asar'));
    fs.copyFileSync(sourceSetupPath, path.join(packagesChannelDir, 'Flux Tasks Setup.exe'));
    console.log(`Файлы обновлений скопированы в packages/${channel}/`);

    // Файлы для загрузки на GitHub Releases (только манифесты и app.asar)
    const uploadFiles = [];

    // 1. Добавление манифестов
    if (channel === 'stable') {
      uploadFiles.push({ path: path.join(manifestsDir, 'latest.json'), name: 'latest.json' });
      uploadFiles.push({ path: path.join(manifestsDir, 'latest-stable.json'), name: 'latest-stable.json' });
    } else {
      uploadFiles.push({ path: path.join(manifestsDir, `latest-${channel}.json`), name: `latest-${channel}.json` });
    }

    // 2. Добавление app.asar
    uploadFiles.push({ path: finalAsarPath, name: 'app.asar' });

    // 5c. Валидация загружаемых файлов перед релизом
    console.log('\nПроверка наличия файлов релиза...');
    for (const asset of uploadFiles) {
      if (!fs.existsSync(asset.path)) {
        throw new Error(`Отсутствует обязательный файл релиза: ${asset.name} (проверенный путь: ${asset.path})`);
      }
      console.log(`- Проверено: ${asset.name}`);
    }

    // 6. Автоматическое создание релиза на GitHub и загрузка файлов
    if (!token) {
      console.log('\n[Предупреждение] Токен GitHub GITHUB_TOKEN не задан. Пропускаем автоматическую публикацию в GitHub Releases.');
      console.log('Все файлы OTA-обновления и манифесты были успешно скомпилированы локально в: /release');
      rl.close();
      return;
    }

    console.log('\nОбнаружен токен GitHub. Получаем или создаем удаленный релиз на GitHub...');
    
    let gitRelease;
    try {
      console.log(`Проверяем наличие существующего релиза для тега v${version}...`);
      gitRelease = await githubRequest('GET', `/repos/${repoOwner}/${repoName}/releases/tags/v${version}`, token);
      console.log(`Найден существующий релиз для тега v${version} (ID: ${gitRelease.id})`);
    } catch (e) {
      console.log(`Релиз для тега v${version} не найден, создаем новый...`);
      const releasePayload = JSON.stringify({
        tag_name: `v${version}`,
        target_commitish: 'main',
        name: title,
        body: releaseNotes.map(n => `- ${n}`).join('\n'),
        draft: false,
        prerelease: channel !== 'stable'
      });
      const releaseEndpoint = `/repos/${repoOwner}/${repoName}/releases`;
      gitRelease = await githubRequest('POST', releaseEndpoint, token, releasePayload);
      console.log('GitHub-релиз успешно создан');
    }

    const releaseId = gitRelease.id;
    const uploadUrlRaw = gitRelease.upload_url;

    // Проверка существующих файлов в релизе для предотвращения дубликатов
    console.log('\nПроверка существующих файлов в релизе для предотвращения дубликатов...');
    const existingAssets = await getExistingAssets(repoOwner, repoName, releaseId, token);

    // Загрузка файлов по очереди
    for (const fileInfo of uploadFiles) {
      // Проверка дубликата
      const duplicate = existingAssets.find(a => a.name === fileInfo.name);
      if (duplicate) {
        console.log(`Файл ${fileInfo.name} уже существует. Удаление дубликата...`);
        await deleteAsset(repoOwner, repoName, duplicate.id, token);
        await new Promise(r => setTimeout(r, 1000)); // Задержка 1 секунда
      }

      console.log(`Начинаем загрузку: ${fileInfo.name}`);
      await uploadAssetFile(fileInfo.path, uploadUrlRaw, token);
    }

    console.log(`
Релиз успешно создан.

Версия:
${version}

Канал:
${channel}

Загруженные файлы:
${uploadFiles.map(f => `- ${f.name}`).join('\n')}

GitHub:
https://github.com/${repoOwner}/${repoName}/releases/tag/v${version}
`);
  } catch (err) {
    console.error('\n[КРИТИЧЕСКАЯ ОШИБКА] Сбой конвейера релиза:', err.message);
  } finally {
    rl.close();
  }
}

startRelease();

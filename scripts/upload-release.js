const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PROJECT_DIR = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(PROJECT_DIR, 'release');

function prompt(question) {
  return new Promise((resolve) => rl.question(question, resolve));
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
    timeout: 90000 // Тайм-аут 90 секунд
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
        if (percent >= lastPercent + 5 || now - lastLogTime >= 1000 || percent === 100) {
          lastPercent = percent;
          lastLogTime = now;
          process.stdout.write(`Загрузка ${fileName}: ${(uploadedBytes / (1024 * 1024)).toFixed(2)} / ${(fileSize / (1024 * 1024)).toFixed(2)} MB (${percent}%)\r`);
        }
      });

      fileStream.on('error', (err) => {
        console.error(`\nОшибка чтения потока: ${err.message}`);
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

async function startUpload() {
  console.log('=== Автоматический загрузчик файлов релиза Flux Tasks ===\n');

  try {
    // 1. Определение имени тега
    let tag = '';
    const tagIdx = process.argv.indexOf('--tag');
    if (tagIdx !== -1 && process.argv[tagIdx + 1]) {
      tag = process.argv[tagIdx + 1];
    } else {
      const tagEquals = process.argv.find(arg => arg.startsWith('--tag='));
      if (tagEquals) tag = tagEquals.split('=')[1];
    }

    if (!tag) {
      tag = (await prompt('Введите целевой тег релиза (например, v1.0.0): ')).trim();
    }

    if (!tag) {
      throw new Error('Имя тега релиза обязательно.');
    }

    // Приведение к стандарту с префиксом v
    if (!tag.startsWith('v')) {
      tag = `v${tag}`;
    }

    // 2. Загрузка конфигурации из окружения / `.env`
    let repoOwner = process.env.GITHUB_OWNER || 'Straniksss';
    let repoName = process.env.GITHUB_REPO || 'Flux-Tasks';
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

    if (!token) {
      throw new Error('GITHUB_TOKEN не найден в переменных окружения или файле .env.');
    }

    // 3. Загрузка манифеста для получения сведений о версии
    const manifestsDir = path.join(RELEASE_DIR, 'manifests');
    const latestJsonPath = path.join(manifestsDir, 'latest.json');
    if (!fs.existsSync(latestJsonPath)) {
      throw new Error(`Манифест latest.json не найден по пути: ${latestJsonPath}. Убедитесь, что сначала запустили 'npm run package'!`);
    }

    const manifest = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
    const version = manifest.version;
    const channel = manifest.channel;

    // Проверка соответствия тега версии в манифесте
    if (tag !== `v${version}`) {
      console.log(`[Предупреждение] Имя тега ${tag} не совпадает с версией манифеста v${version}. Продолжаем с именами из манифеста.`);
    }

    const finalAsarPath = path.join(RELEASE_DIR, 'app.asar');
    if (!fs.existsSync(finalAsarPath)) {
      throw new Error(`Файл app.asar не найден по пути: ${finalAsarPath}. Убедитесь, что сначала запустили 'npm run package'!`);
    }

    // Файлы для загрузки
    const uploadFiles = [
      { path: latestJsonPath, name: 'latest.json' },
      { path: finalAsarPath, name: 'app.asar' }
    ];

    // 5b. Валидация файлов перед загрузкой
    console.log('\nПроверка наличия файлов релиза...');
    for (const asset of uploadFiles) {
      if (!fs.existsSync(asset.path)) {
        throw new Error(`Отсутствует обязательный файл релиза: ${asset.name} (проверенный путь: ${asset.path})`);
      }
      console.log(`- Проверено: ${asset.name}`);
    }

    // Проверка наличия локальных файлов в папке release/
    console.log('Проверка наличия файлов локально в папке release/...');
    for (const fileInfo of uploadFiles) {
      if (!fs.existsSync(fileInfo.path)) {
        throw new Error(`Локальный файл не найден: ${fileInfo.name} (${fileInfo.path})`);
      }
      console.log(`- Найден ${fileInfo.name} (${(fs.statSync(fileInfo.path).size / (1024 * 1024)).toFixed(2)} MB)`);
    }

    // 4. Получение данных о релизе на GitHub по тегу
    console.log(`\nПолучение информации о релизе для тега: ${tag}...`);
    let gitRelease;
    try {
      const releaseEndpoint = `/repos/${repoOwner}/${repoName}/releases/tags/${tag}`;
      gitRelease = await githubRequest('GET', releaseEndpoint, token);
    } catch (err) {
      console.log(`Запрос к эндпоинту тега вернул ошибку: ${err.message}. Пробуем получить список релизов...`);
      const allReleases = await githubRequest('GET', `/repos/${repoOwner}/${repoName}/releases`, token);
      gitRelease = allReleases.find(r => r.tag_name === tag);
      if (!gitRelease) {
        throw new Error(`Релиз с тегом ${tag} не найден на GitHub (даже как черновик).`);
      }
    }
    const releaseId = gitRelease.id;
    const uploadUrlRaw = gitRelease.upload_url;
    console.log(`Найден релиз ID ${releaseId}. URL загрузки: ${uploadUrlRaw}`);

    // 5. Проверка существующих файлов в релизе
    console.log('Проверка существующих файлов в релизе...');
    const existingAssets = await getExistingAssets(repoOwner, repoName, releaseId, token);

    // 6. Загрузка файлов
    for (const fileInfo of uploadFiles) {
      const duplicate = existingAssets.find(a => a.name === fileInfo.name);
      if (duplicate) {
        console.log(`Файл ${fileInfo.name} уже существует. Сначала удаляем старый файл...`);
        await deleteAsset(repoOwner, repoName, duplicate.id, token);
        await new Promise(r => setTimeout(r, 1000)); // задержка 1 секунда
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
https://github.com/${repoOwner}/${repoName}/releases/tag/${tag}
`);
  } catch (err) {
    console.error('\n[КРИТИЧЕСКАЯ ОШИБКА] Ошибка загрузки:', err.message);
  } finally {
    rl.close();
  }
}

startUpload();

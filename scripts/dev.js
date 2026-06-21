const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

// Сборка файлов Electron
async function buildElectron() {
  console.log('Сборка Electron скриптов main и preload...');
  const distDir = path.join(__dirname, '../dist-electron');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/main.ts')],
    bundle: true,
    platform: 'node',
    external: ['electron'],
    outfile: path.join(__dirname, '../dist-electron/main.js'),
    sourcemap: true,
  });

  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/preload.ts')],
    bundle: true,
    platform: 'node',
    external: ['electron'],
    outfile: path.join(__dirname, '../dist-electron/preload.js'),
    sourcemap: true,
  });
  console.log('Сборка Electron скриптов завершена.');
}

async function start() {
  await buildElectron();

  console.log('Запуск сервера разработки Vite...');
  const vite = spawn('npx', ['vite', '--port=3000'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, DISABLE_HMR: 'false' }
  });

  let electronStarted = false;

  vite.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Vite] ${output.trim()}`);
    
    // Проверка, что сервер запущен на порту 3000
    if (output.includes('3000') && !electronStarted) {
      electronStarted = true;
      console.log('Сервер Vite готов, запуск Electron...');
      
      // Запуск Electron
      const electron = spawn('npx', ['electron', '.'], {
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' }
      });

      electron.on('close', (code) => {
        console.log(`Electron закрылся с кодом ${code}. Останавливаем Vite...`);
        vite.kill();
        process.exit(code);
      });
    }
  });

  vite.stderr.on('data', (data) => {
    console.error(`[Ошибка Vite] ${data.toString().trim()}`);
  });

  vite.on('close', (code) => {
    console.log(`Сервер Vite закрылся с кодом ${code}`);
  });
}

start().catch(err => {
  console.error('Не удалось запустить процесс разработки:', err);
  process.exit(1);
});

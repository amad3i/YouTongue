// src/index.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path    = require('path');
const fs      = require('fs');
const { spawn } = require('child\_process');
const youtubedl = require('youtube-dl-exec');

function createWindow() {
const win = new BrowserWindow({
width: 900,
height: 700,
webPreferences: {
preload: path.join(__dirname, 'preload.js'),
contextIsolation: true,
nodeIntegration: false,
},
});
win.removeMenu();
win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

function send(event, msg) {
event.reply('process-status', msg);
}

ipcMain.on('process-video', async (event, opts) => {
const { url, mode, reslang } = opts;
const appDir       = __dirname;                             // .../YouTongue/src
const translatedDir = path.join(appDir, 'translated');      // .../YouTongue/src/translated
const tmpDir        = path.join(translatedDir, 'tmp');      // .../YouTongue/src/translated/tmp

// очистка и создание папок
fs.rmSync(tmpDir,    { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(translatedDir, { recursive: true });

// 1) скачиваем видео
send(event, '1/3: скачиваем видео…');
const videoPath = path.join(tmpDir, 'video.mp4');
try {
await youtubedl(url, {
o: videoPath,
f: 'bestvideo\[ext=mp4]+bestaudio\[ext=m4a]/best',
});
send(event, '✅ Видео скачано');
} catch (err) {
send(event, `❌ Ошибка скачивания: ${err.message}`);
return;
}

// 2) переводим аудио через vot-cli
send(event, '2/3: переводим аудио…');
try {
const cliScript = path.join(appDir, '..', 'vot-cli', 'src', 'index.js');
const args = [
cliScript,
url,
'--output', tmpDir,
'--reslang', reslang,
mode === 'subs'     && '--subs',
mode === 'subs-srt' && '--subs-srt',
].filter(Boolean);


await new Promise((resolve, reject) => {
  const proc = spawn('node', args, {
    cwd: path.join(appDir, '..', 'vot-cli'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', d => console.log('[vot-cli]', d.toString()));
  proc.stderr.on('data', d => console.error('[vot-cli]', d.toString()));
  proc.on('close', code => code === 0 ? resolve() : reject(new Error(`vot-cli exited with ${code}`)));
});

// проверяем, что mp3 действительно появился
const mp3files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
if (!mp3files.length) {
  throw new Error('vot-cli не сохранил mp3 в папку tmp');
}
send(event, '✅ Аудио переведено и сохранено в tmp');


} catch (err) {
send(event, `❌ Ошибка translate: ${err.message}`);
return;
}

// 3) склеиваем видео + переведённое аудио
// …после успешного скачивания видео и перевода аудио…
send(event, '3/3: объединяем видео и аудио…');

const audioFile = fs.readdirSync(tmpDir).find(f => f.endsWith('.mp3'));
const audioPath = path.join(tmpDir, audioFile);
const finalPath = path.join(translatedDir, 'final.mp4');

try {
await new Promise((resolve, reject) => {
const ff2 = spawn('ffmpeg', [
'-y',
'-i', videoPath,
'-i', audioPath,
'-map', '0\:v',
'-map', '1\:a',
'-c\:v', 'copy',
'-c\:a', 'aac',
'-shortest',
finalPath,
]);


ff2.stdout.on('data', chunk => {
  const msg = chunk.toString();
  console.log('[ffmpeg]', msg);
  // если нужно — раскомментируй, чтобы показывать пользователю:
  // send(event, msg);
});
ff2.stderr.on('data', chunk => {
  const msg = chunk.toString();
  console.error('[ffmpeg]', msg);
  // send(event, msg);
});

ff2.on('error', err => reject(err));
ff2.on('close', code => {
  if (code === 0) resolve();
  else reject(new Error(`ffmpeg exited with code ${code}`));
});


});

send(event, `✅ Склейка завершена: ${finalPath}`);
} catch (err) {
console.error('\[ffmpeg merge]', err);
send(event, `❌ Ошибка склейки: ${err.message}`);
}

});

app.on('window-all-closed', () => {
if (process.platform !== 'darwin') app.quit();
});

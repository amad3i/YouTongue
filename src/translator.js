const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function translateAudio(event, url, tmpDir, reslang, mode, appDir) {
  try {
    const cliScript = path.join(appDir, '..', 'vot-cli', 'src', 'index.js');
    const args = [
      cliScript,
      url,
      '--output', tmpDir,
      '--reslang', reslang,
      mode === 'subs' && '--subs',
      mode === 'subs-srt' && '--subs-srt',
    ].filter(Boolean);

    await new Promise((resolve, reject) => {
      const proc = spawn('node', args, {
        cwd: path.join(appDir, '..', 'vot-cli'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', d => {
        const msg = d.toString();
        console.log('[vot-cli]', msg);
        // Поскольку прогресса от vot-cli нет, используем фиксированные шаги
        if (msg.includes('downloading')) {
          event.reply('process-status', 'Перевод: скачивание аудио…', 40);
        } else if (msg.includes('translating')) {
          event.reply('process-status', 'Перевод: обработка…', 50);
        }
      });
      proc.stderr.on('data', d => console.error('[vot-cli]', d.toString()));
      proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`vot-cli exited with ${code}`))));
    });

    const mp3files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.mp3'));
    if (!mp3files.length) {
      throw new Error('vot-cli не сохранил mp3 в папку tmp');
    }

    const audioFile = mp3files[0];
    const audioPath = path.join(tmpDir, audioFile);
    event.reply('process-status', '✅ Аудио переведено', 66);
    return audioPath;
  } catch (err) {
    event.reply('process-status', `❌ Ошибка перевода: ${err.message}`);
    throw err;
  }
}

module.exports = { translateAudio };
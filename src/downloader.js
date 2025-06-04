const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

async function downloadVideo(event, url, tmpDir, preferredFormat = '1080') {
  const videoPath = path.join(tmpDir, 'video.mp4');
  let videoTitle = 'video';

  try {
    // Получаем информацию о видео для извлечения названия
    const info = await youtubedl(url, { dumpSingleJson: true });
    videoTitle = info.title.replace(/[^a-zA-Z0-9]/g, '_') || 'video';

    // Настраиваем формат: пытаемся скачать 1080p, иначе берём лучшее доступное видео без аудио
    const format = `bestvideo[height<=${preferredFormat}][ext=mp4]/bestvideo[ext=mp4]`;

    // Запускаем скачивание
    const proc = youtubedl.exec(url, {
      o: videoPath,
      f: format,
    }, { stdio: ['ignore', 'pipe', 'pipe'] });

    // Отслеживаем прогресс через frag
    let lastFrag = 0;
    const interval = setInterval(() => {
      const files = fs.readdirSync(tmpDir).filter(f => f.includes('video') && f.includes('Frag'));
      if (files.length) {
        const file = files[0];
        const fragMatch = file.match(/Frag(\d+)/);
        if (fragMatch) {
          const frag = parseInt(fragMatch[1], 10);
          if (frag !== lastFrag) {
            lastFrag = frag;
            const progress = Math.min(frag, 100); // frag не больше 100
            event.reply('process-status', `Скачивание: ${progress}%`, (progress / 3).toFixed(2));
          }
        }
      }
    }, 1000);

    await new Promise((resolve, reject) => {
      proc.on('error', err => {
        clearInterval(interval);
        reject(err);
      });
      proc.on('close', code => {
        clearInterval(interval);
        if (code === 0) resolve();
        else reject(new Error(`youtube-dl exited with ${code}`));
      });
    });

    event.reply('process-status', '✅ Видео скачано', 33);
    return { videoPath, videoTitle };
  } catch (err) {
    event.reply('process-status', `❌ Ошибка скачивания: ${err.message}`);
    throw err;
  }
}

module.exports = { downloadVideo };
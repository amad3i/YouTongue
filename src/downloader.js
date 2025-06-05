const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

async function downloadVideo(event, url, tmpDir, blockIndex) {
  const outputPath = path.join(tmpDir, 'video.mp4');
  let lastPercent = 0;

  try {
    // Задержка перед началом загрузки, чтобы избежать 429 ошибки
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Запускаем скачивание с выводом прогресса в виде файлов и 4 фрагментами
    const downloadProcess = youtubedl(url, {
      output: `${outputPath}.part`,
      format: 'bestvideo',
      noAudio: true,
      'concurrent-fragments': 4, // Уменьшаем до 4 фрагментов
      retries: 3, // Добавляем 3 попытки при ошибках
    });

    // Периодически проверяем файлы в tmpDir
    const checkProgress = () => {
      try {
        const files = fs.readdirSync(tmpDir);
        const fragFiles = files.filter(file => file.startsWith('video.mp4.part.part-Frag') && file.endsWith('.part'));
        if (fragFiles.length > 0) {
          const latestFrag = fragFiles
            .map(file => {
              const match = file.match(/part-Frag(\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .sort((a, b) => b - a)[0];
          if (latestFrag !== undefined && latestFrag !== lastPercent) {
            const percent = Math.min(Math.max(latestFrag, 0), 100);
            lastPercent = percent;
            console.log(`[Downloader] Found part-Frag${latestFrag}, sending percent: ${percent}% for block ${blockIndex}`);
            event.reply('process-status', `Скачивание: ${url}`, percent, blockIndex);
          }
        } else {
          console.log(`[Downloader] No part-Frag files found in ${tmpDir}`);
        }
      } catch (err) {
        console.error(`[Downloader] Error reading tmpDir: ${err.message}`);
      }
    };

    const interval = setInterval(checkProgress, 500);

    await new Promise((resolve, reject) => {
      const watcher = fs.watch(tmpDir, (eventType, filename) => {
        if (filename && fs.existsSync(outputPath)) {
          console.log(`[Downloader] Final file ${outputPath} detected, stopping interval`);
          clearInterval(interval);
          watcher.close();
          resolve();
        }
      });

      downloadProcess
        .then(() => {
          console.log('[Downloader] Download process completed');
          checkProgress();
          clearInterval(interval);
          watcher.close();
          resolve();
        })
        .catch(err => {
          console.error(`[Downloader] Download failed: ${err.message}`);
          clearInterval(interval);
          watcher.close();
          reject(err);
        });

      const checkFileInterval = setInterval(() => {
        if (fs.existsSync(outputPath)) {
          console.log(`[Downloader] Final file ${outputPath} exists, stopping intervals`);
          clearInterval(interval);
          clearInterval(checkFileInterval);
          watcher.close();
          resolve();
        }
      }, 2000);
    });

    const info = await youtubedl(url, { dumpSingleJson: true });
    if (fs.existsSync(`${outputPath}.part`)) {
      fs.renameSync(`${outputPath}.part`, outputPath);
    }
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error('The downloaded file is empty');
    }
    console.log(`[Downloader] Download completed for ${url}, final percent: ${lastPercent}%`);
    return { videoPath: outputPath, videoTitle: info.title.replace(/[^a-zA-Z0-9-_]/g, '_') };
  } catch (err) {
    console.error(`[Downloader] Error in downloadVideo: ${err.message}`);
    throw err;
  }
}

module.exports = { downloadVideo };
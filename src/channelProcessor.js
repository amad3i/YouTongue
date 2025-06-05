const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { downloadVideo } = require('./downloader');
const { translateAudio } = require('./translator');
const { mergeVideoAndAudio } = require('./merger');

function createLimiter(maxConcurrent) {
  const queue = [];
  let active = 0;

  async function runNext() {
    if (active >= maxConcurrent || queue.length === 0) return;
    active++;
    const task = queue.shift();
    try {
      await task();
    } finally {
      active--;
      runNext();
    }
  }

  return async function add(task) {
    queue.push(task);
    await runNext();
  };
}

function logError(translatedDir, videoUrl, errorMessage) {
  const logPath = path.join(translatedDir, 'errors.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Video URL: ${videoUrl}\nError: ${errorMessage}\n\n`;
  fs.appendFileSync(logPath, logEntry, 'utf8');
}

function getProcessedVideos(translatedDir) {
  const processedFile = path.join(translatedDir, 'processed_videos.txt');
  if (!fs.existsSync(processedFile)) {
    return new Set();
  }
  const content = fs.readFileSync(processedFile, 'utf8');
  return new Set(content.split('\n').filter(line => line.trim()));
}

function addProcessedVideo(translatedDir, videoUrl) {
  const processedFile = path.join(translatedDir, 'processed_videos.txt');
  fs.appendFileSync(processedFile, `${videoUrl}\n`, 'utf8');
}

async function processChannelOrVideo(event, opts, processData) {
  const { url, mode, reslang, folderPath, blockIndex } = opts;
  const appDir = __dirname;
  const translatedDir = folderPath || path.join(appDir, 'translated');

  console.log(`[ChannelProcessor] Using translatedDir: ${translatedDir}`);

  // Загружаем список уже обработанных видео
  const processedVideos = getProcessedVideos(translatedDir);

  const isChannel = url.includes('/@') || url.includes('/channel/');
  let videoUrls = [];

  if (isChannel) {
    event.reply('process-status', 'Получаем список видео с канала…', 0, blockIndex);
    try {
      const channelVideosUrl = url.endsWith('/videos') ? url : `${url}/videos`;
      const videoList = await youtubedl(channelVideosUrl, {
        dumpSingleJson: true,
        flatPlaylist: true,
      });
      videoUrls = videoList.entries ? videoList.entries.map(entry => `https://www.youtube.com/watch?v=${entry.id}`) : [];
      event.reply('process-status', `Найдено ${videoUrls.length} видео на канале`, 0, blockIndex);
    } catch (err) {
      event.reply('process-status', `❌ Ошибка получения списка видео: ${err.message}`, undefined, blockIndex);
      logError(translatedDir, url, err.message);
      return;
    }
  } else {
    videoUrls = [url];
  }

  let channelName = 'UnknownChannel';
  if (isChannel) {
    const match = url.match(/\/@([^\/]+)|\/channel\/([^\/]+)/);
    if (match) {
      channelName = match[1] || match[2];
    }
  } else {
    try {
      const info = await youtubedl(url, { dumpSingleJson: true });
      channelName = info.uploader || 'UnknownChannel';
    } catch (err) {
      console.error('[youtube-dl channel]', err);
    }
  }
  channelName = channelName.replace(/[^a-zA-Z0-9-_]/g, '_');

  const channelDir = path.join(translatedDir, channelName);
  fs.mkdirSync(channelDir, { recursive: true });

  const limiter = createLimiter(1);
  let processedCount = 0;

  for (const videoUrl of videoUrls) {
    if (processData.stopped) {
      event.reply('process-status', 'Процесс остановлен', undefined, blockIndex);
      break;
    }

    // Проверяем, обработано ли видео ранее
    if (processedVideos.has(videoUrl)) {
      event.reply('process-status', `Видео уже обработано: ${videoUrl}, пропускаем`, undefined, blockIndex);
      continue;
    }

    try {
      event.reply('process-status', `Обработка видео ${processedCount + 1}/${videoUrls.length}: ${videoUrl}`, undefined, blockIndex);

      const taskId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const tmpDir = path.join(channelDir, `tmp_${taskId}`);

      if (fs.existsSync(tmpDir)) {
        console.log(`[ChannelProcessor] Cleaning up existing tmpDir: ${tmpDir}`);
        fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      fs.mkdirSync(tmpDir, { recursive: true });

      const { videoPath, videoTitle } = await downloadVideo(event, videoUrl, tmpDir, blockIndex);

      event.reply('process-status', `Перевод аудио ${processedCount + 1}/${videoUrls.length}`, undefined, blockIndex);
      const audioPath = await translateAudio(event, videoUrl, tmpDir, reslang, mode, appDir, blockIndex);

      event.reply('process-status', `Склейка видео ${processedCount + 1}/${videoUrls.length}`, undefined, blockIndex);
      const finalPath = path.join(channelDir, `${videoTitle}.mp4`);
      await mergeVideoAndAudio(event, videoPath, audioPath, finalPath, blockIndex);

      processedCount++;
      event.reply('process-status', `Готово видео ${processedCount}/${videoUrls.length}`, (processedCount / videoUrls.length) * 100, blockIndex);

      // Добавляем видео в список обработанных
      addProcessedVideo(translatedDir, videoUrl);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
      const errorMessage = `⚠️ Пропущено видео ${processedCount + 1}/${videoUrls.length}: ${err.message}`;
      event.reply('process-status', errorMessage, undefined, blockIndex);
      logError(translatedDir, videoUrl, err.message);
      continue;
    }
  }

  if (processedCount === videoUrls.length) {
    event.reply('process-status', `Все видео с канала ${channelName} обработаны (${processedCount}/${videoUrls.length})`, 100, blockIndex);
  } else {
    event.reply('process-status', `Обработка завершена с ошибками (${processedCount}/${videoUrls.length} видео обработано)`, 100, blockIndex);
  }
}

module.exports = { processChannelOrVideo };
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const pLimit = require('p-limit');
const { downloadVideo } = require('./downloader');
const { translateAudio } = require('./translator');
const { mergeVideoAndAudio } = require('./merger');

async function processChannelOrVideo(event, opts) {
  const { url, mode, reslang } = opts;
  const appDir = __dirname;
  const translatedDir = path.join(appDir, 'translated');

  // Проверяем, является ли URL каналом
  const isChannel = url.includes('/@') || url.includes('/channel/');
  let videoUrls = [];

  if (isChannel) {
    event.reply('process-status', 'Получаем список видео с канала…', 0);
    try {
      const channelVideosUrl = url.endsWith('/videos') ? url : `${url}/videos`;
      const videoList = await youtubedl(channelVideosUrl, {
        dumpSingleJson: true,
        flatPlaylist: true,
      });
      videoUrls = videoList.entries ? videoList.entries.map(entry => `https://www.youtube.com/watch?v=${entry.id}`) : [];
      event.reply('process-status', `Найдено ${videoUrls.length} видео на канале`, 0);
    } catch (err) {
      event.reply('process-status', `❌ Ошибка получения списка видео: ${err.message}`);
      return;
    }
  } else {
    videoUrls = [url];
  }

  // Извлекаем имя канала
  let channelName = 'UnknownChannel';
  if (isChannel) {
    const match = url.match(/\/@([^\/]+)|\/channel\/([^\/]+)/);
    if (match) channelName = match[1] || match[2];
  } else {
    try {
      const info = await youtubedl(url, { dumpSingleJson: true });
      channelName = info.uploader.replace(/[^a-zA-Z0-9]/g, '_') || 'UnknownChannel';
    } catch (err) {
      console.error('[youtube-dl channel]', err);
    }
  }

  // Создаём папку для канала
  const channelDir = path.join(translatedDir, channelName);
  fs.mkdirSync(channelDir, { recursive: true });

  // Обрабатываем видео параллельно (максимум 5 одновременно)
  const limit = pLimit(5);
  const tasks = videoUrls.map((videoUrl, i) => limit(async () => {
    event.reply('process-status', `Обработка видео ${i + 1}/${videoUrls.length}: ${videoUrl}`, (i / videoUrls.length) * 10);

    const tmpDir = path.join(channelDir, `tmp_${i}`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // 1) Скачивание видео
      const { videoPath, videoTitle } = await downloadVideo(event, videoUrl, tmpDir);

      // 2) Перевод аудио
      const audioPath = await translateAudio(event, videoUrl, tmpDir, reslang, mode, appDir);

      // 3) Склейка
      const finalPath = path.join(channelDir, `${videoTitle}.mp4`);
      await mergeVideoAndAudio(event, videoPath, audioPath, finalPath);

      // Очистка
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
      event.reply('process-status', `⚠️ Пропущено видео ${i + 1}: ${err.message}`);
    }
  }));

  await Promise.all(tasks);
  event.reply('process-status', `Все видео с канала ${channelName} обработаны`, 100);
}

module.exports = { processChannelOrVideo };
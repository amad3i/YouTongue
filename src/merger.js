const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

async function mergeVideoAndAudio(event, videoPath, audioPath, finalPath) {
  try {
    await new Promise((resolve, reject) => {
      const ff = ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions('-map 0:v -map 1:a -c:v copy -c:a aac -shortest')
        .save(finalPath);

      ff.on('progress', progress => {
        const percent = (progress.percent || 0).toFixed(2);
        event.reply('process-status', `Склейка: ${percent}%`, 66 + (percent / 3));
      });

      ff.on('error', err => reject(err));
      ff.on('end', () => resolve());
    });

    event.reply('process-status', `✅ Склейка завершена: ${finalPath}`, 100);
  } catch (err) {
    event.reply('process-status', `❌ Ошибка склейки: ${err.message}`);
    throw err;
  }
}

module.exports = { mergeVideoAndAudio };
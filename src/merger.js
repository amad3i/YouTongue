const { spawn } = require('child_process');
const fs = require('fs');

async function mergeVideoAndAudio(event, videoPath, audioPath, finalPath, blockIndex) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log(`[Merger] Merging video: ${videoPath}, audio: ${audioPath}, output: ${finalPath}`);

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-map', '0:v',
      '-map', '1:a',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      finalPath,
    ];

    const ff = spawn('ffmpeg', args);

    ff.stdout.on('data', chunk => {
      const msg = chunk.toString();
      console.log('[ffmpeg]', msg);
    });

    ff.stderr.on('data', chunk => {
      const msg = chunk.toString();
      console.error('[ffmpeg]', msg);
    });

    ff.on('error', err => {
      console.error('[ffmpeg] Error:', err);
      reject(err);
    });

    ff.on('close', code => {
      if (code === 0) {
        console.log(`[Merger] Successfully merged to ${finalPath}`);
        resolve();
      } else {
        const err = new Error(`ffmpeg exited with code ${code}`);
        console.error('[ffmpeg] Error:', err);
        reject(err);
      }
    });
  });
}

module.exports = { mergeVideoAndAudio };
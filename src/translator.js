const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

async function translateAudio(event, videoUrl, tmpDir, reslang, mode, appDir, blockIndex) {
  const cliScript = path.join(appDir, '..', 'vot-cli', 'src', 'index.js');
  console.log(`[Translator] Running vot-cli with output dir: ${tmpDir}`);

  const args = [
    cliScript,
    videoUrl,
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

    proc.stdout.on('data', d => console.log('[vot-cli]', d.toString()));
    proc.stderr.on('data', d => console.error('[vot-cli]', d.toString()));
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`vot-cli exited with ${code}`)));
  });

  const files = fs.readdirSync(tmpDir);
  if (mode === 'audio') {
    const mp3Files = files.filter(f => f.endsWith('.mp3'));
    if (!mp3Files.length) {
      throw new Error('vot-cli не сохранил mp3 в папку tmp');
    }
    return path.join(tmpDir, mp3Files[0]);
  } else {
    const subtitleFiles = files.filter(f => f.endsWith('.vtt') || f.endsWith('.srt'));
    if (!subtitleFiles.length) {
      throw new Error('vot-cli не сохранил субтитры в папку tmp');
    }
    return path.join(tmpDir, subtitleFiles[0]);
  }
}

module.exports = { translateAudio };
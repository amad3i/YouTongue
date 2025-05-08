window.addEventListener('DOMContentLoaded', () => {
    const inpUrl  = document.getElementById('video-url');
    const btn     = document.getElementById('process-button');
    const merge   = document.getElementById('merge-button');
    const status  = document.getElementById('status');
  
    btn.addEventListener('click', () => {
      status.innerText = '🚀 Запуск обработки...\n';
      const url = inpUrl.value.trim();
      if (!url) {
        status.innerText = 'Введите ссылку на видео';
        return;
      }
      window.youTongue.processVideo({ url, mode: 'audio', reslang: 'ru' });
    });
  
    merge.addEventListener('click', () => {
      status.innerText = '🚧 Запуск склейки...\n';
      window.youTongue.mergeVideo();
    });
  
    window.youTongue.onStatus(msg => {
      status.innerText += msg + '\n';
      status.scrollTop = status.scrollHeight; // автопрокрутка вниз
    });
  });
  
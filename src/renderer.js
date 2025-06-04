window.addEventListener('DOMContentLoaded', () => {
  let blockCount = 1;
  let processes = {};
  const canvas = document.getElementById('canvas');
  const cardWidth = 400;
  const cardHeight = 500;
  const padding = 30;
  const maxCardsPerRow = 4;

  function initializeBlock(index) {
    const block = document.querySelector(`.card[data-index="${index}"]`);
    const inpUrl = document.getElementById(`video-url-${index}`);
    const btn = document.getElementById(`process-button-${index}`);
    const modeSelect = document.getElementById(`mode-${index}`);
    const reslangSelect = document.getElementById(`reslang-${index}`);
    const progressBar = document.getElementById(`progress-bar-${index}`);
    const progressText = document.getElementById(`progress-text-${index}`);
    const operationText = document.getElementById(`operation-text-${index}`);
    const selectFolderButton = document.getElementById(`select-folder-button-${index}`);
    const selectedFolderSpan = document.getElementById(`selected-folder-${index}`);
    const closeButton = document.getElementById(`close-block-${index}`);

    function toggleInputs(disabled) {
      inpUrl.disabled = disabled;
      modeSelect.disabled = disabled;
      reslangSelect.disabled = disabled;
      selectFolderButton.disabled = disabled;
    }

    selectFolderButton.addEventListener('click', () => {
      window.youTongue.selectFolder().then(folderPath => {
        if (folderPath) selectedFolderSpan.textContent = folderPath;
      });
    });

    closeButton.addEventListener('click', () => {
      if (processes[index]) {
        window.youTongue.stopProcess(index);
        delete processes[index];
      }
      block.remove();
      updateCanvasSize();
    });

    btn.addEventListener('click', () => {
      const action = btn.innerText;
      if (action === '🚀 Перевести') {
        progressBar.style.width = '0%';
        progressText.innerText = 'Прогресс: 0%';
        operationText.innerText = 'Запуск обработки...';
        const url = inpUrl.value.trim();
        if (!url) {
          operationText.innerText = 'Введите ссылку на видео или канал';
          return;
        }
        const folderPath = selectedFolderSpan.textContent === 'Папка' ? path.join(__dirname, 'translated') : selectedFolderSpan.textContent;
        toggleInputs(true);
        btn.innerText = '🛑 Остановить';
        processes[index] = true;
        window.youTongue.processVideo({
          url,
          mode: modeSelect.value,
          reslang: reslangSelect.value,
          folderPath,
          blockIndex: index,
        });
      } else if (action === '🛑 Остановить') {
        window.youTongue.stopProcess(index);
        delete processes[index];
        btn.innerText = '🔄 Возобновить';
        toggleInputs(false);
      } else if (action === '🔄 Возобновить') {
        progressBar.style.width = '0%';
        progressText.innerText = 'Прогресс: 0%';
        operationText.innerText = 'Запуск обработки...';
        const url = inpUrl.value.trim();
        const folderPath = selectedFolderSpan.textContent === 'Папка' ? path.join(__dirname, 'translated') : selectedFolderSpan.textContent;
        toggleInputs(true);
        btn.innerText = '🛑 Остановить';
        processes[index] = true;
        window.youTongue.processVideo({
          url,
          mode: modeSelect.value,
          reslang: reslangSelect.value,
          folderPath,
          blockIndex: index,
        });
      } else if (action === '📂 Открыть') {
        window.youTongue.openFolder(selectedFolderSpan.textContent);
      }
    });

    window.youTongue.onStatus((msg, progress, blockIndex) => {
      if (blockIndex !== index) return;
      operationText.innerText = msg;

      let percent = 0;
      const fragMatch = msg.match(/part-Frag(\d+)/);
      if (fragMatch) {
        percent = parseInt(fragMatch[1], 10);
      } else if (progress !== undefined && !isNaN(progress)) {
        percent = Math.min(Math.max(progress, 0), 100);
      }

      progressBar.style.width = `${percent}%`;
      progressText.innerText = `Прогресс: ${percent}%`;

      if (percent === 100) {
        btn.innerText = '📂 Открыть';
        toggleInputs(false);
        delete processes[index];
      } else if (msg.includes('Ошибка')) {
        btn.innerText = '🚀 Перевести';
        toggleInputs(false);
        delete processes[index];
      }
    });
  }

  function updateCanvasSize() {
    const blocks = canvas.querySelectorAll('.card');
    const blockCount = blocks.length;

    if (blockCount === 0) {
      canvas.innerHTML = '<p id="no-tasks-text" class="text-blue-white text-center text-base">Добавьте новую задачу, нажав \"+\" вверху.</p>';
      window.youTongue.resizeWindow(900, 700);
      return;
    } else if (blockCount === 1 && canvas.querySelector('#no-tasks-text')) {
      canvas.querySelector('#no-tasks-text').remove();
    }

    const cols = Math.min(blockCount, maxCardsPerRow);
    const rows = Math.ceil(blockCount / maxCardsPerRow);
    const newWidth = cols * (cardWidth + padding) + 60;
    const newHeight = rows * (cardHeight + padding) + 100;

    window.youTongue.resizeWindow(Math.min(Math.max(900, newWidth), 1280), Math.min(Math.max(700, newHeight), 800));
  }

  function appendBlock() {
    const template = document.createElement('div');
    template.className = 'card p-4 rounded-lg shadow-lg';
    template.dataset.index = blockCount;
    template.innerHTML = `
      <div class="relative">
        <button id="close-block-${blockCount}" class="absolute top-[-8px] right-0 p-1 text-gray-500 hover:text-red-500 text-xl">✖</button>
        <p class="text-center text-blue-white truncate text-base">↓ Введите ссылку ↓</p>
        <input id="video-url-${blockCount}" type="text" placeholder="https://youtu.be/…" class="w-full p-2 bg-gray-800 text-blue-white border border-gray-600 rounded text-base">
        <select id="mode-${blockCount}" class="w-full p-2 bg-gray-800 text-blue-white border border-gray-600 rounded text-base">
          <option value="audio">Озвучить (MP4)</option>
          <option value="subs">Субтитры (.vtt)</option>
          <option value="subs-srt">Субтитры (.srt)</option>
        </select>
        <select id="reslang-${blockCount}" class="w-full p-2 bg-gray-800 text-blue-white border border-gray-600 rounded text-base">
          <option value="ru">Русский</option>
          <option value="en">Английский</option>
          <option value="kk">Казахский</option>
        </select>
        <button id="select-folder-button-${blockCount}" class="folder-button">
          <span>📁</span><span id="selected-folder-${blockCount}" class="truncate">Папка</span>
        </button>
        <button id="process-button-${blockCount}" class="w-full p-2 bg-blue-accent text-white font-semibold rounded hover:bg-blue-accent-dark text-base">🚀 Перевести</button>
        <div id="progress-container-${blockCount}" class="progress-container">
          <div class="progress-background">
            <div id="progress-bar-${blockCount}" class="progress-bar" style="width: 0%;"></div>
            <div class="progress-text" id="progress-text-${blockCount}">Прогресс: 0%</div>
          </div>
          <p id="operation-text-${blockCount}" class="text-center text-blue-white mt-2 text-base truncate">Ожидание...</p>
        </div>
      </div>
    `;
    canvas.appendChild(template);
    initializeBlock(blockCount);
    blockCount++;
    updateCanvasSize();
  }

  document.getElementById('add-block-button').addEventListener('click', appendBlock);

  document.getElementById('minimize-button').addEventListener('click', () => window.youTongue.minimize());
  document.getElementById('maximize-button').addEventListener('click', () => window.youTongue.maximize());
  document.getElementById('close-button').addEventListener('click', () => window.youTongue.close());

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    document.body.classList.remove('dark-theme', 'light-theme'); // Удаляем обе темы
    const newTheme = isDark ? 'light-theme' : 'dark-theme';
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme === 'dark-theme' ? 'dark' : 'light');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
  });

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.add(savedTheme === 'dark' ? 'dark-theme' : 'light-theme');
  document.getElementById('theme-toggle').innerText = savedTheme === 'dark' ? '🌙' : '☀️';

  initializeBlock(0);
  updateCanvasSize();
  window.youTongue.resizeWindow(900, 700); // Начальные размеры
});
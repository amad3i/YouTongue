const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { processChannelOrVideo } = require('./channelProcessor');

let mainWindow;
const processes = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,
    icon: path.join(__dirname, 'assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[index.js] Ошибка чтения файла ${filePath}: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  shell.openPath(folderPath);
});

ipcMain.on('minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});

ipcMain.on('close', () => {
  app.quit();
});

ipcMain.on('resize-window', (event, width, height) => {
  mainWindow.setSize(width, height);
});

ipcMain.on('lock-size', (event, width, height) => {
  mainWindow.setMinimumSize(width, height);
  mainWindow.setMaximumSize(width, height);
});

ipcMain.on('process-video', async (event, opts) => {
  const { blockIndex } = opts;
  processes[blockIndex] = { stopped: false };

  const send = (msg, progress, sizeMB) => {
    event.sender.send('process-status', msg, progress, blockIndex, sizeMB);
  };

  try {
    await processChannelOrVideo({ reply: send }, opts, processes[blockIndex]);
  } catch (err) {
    send(`❌ Ошибка обработки: ${err.message}`);
  }
});

ipcMain.handle('stop-process', (event, blockIndex) => {
  if (processes[blockIndex]) {
    processes[blockIndex].stopped = true;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { processChannelOrVideo } = require('./channelProcessor');

let mainWindow;
let processes = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 600,
    frame: false,
    resizable: true,
    minWidth: 400,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    });

    mainWindow.on('maximize', () => {
      mainWindow.webContents.send('window-maximized', true);
    });

    mainWindow.on('unmaximize', () => {
      mainWindow.webContents.send('window-unmaximized', false);
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return (result.filePaths[0] || null);
});

ipcMain.on('process-video', async (event, opts) => {
  try {
    if (!processes[opts.blockIndex]) {
      processes[opts.blockIndex] = { opts, stopped: false, totalSize: 0, downloadedSize: 0 };
    }
    const processData = processes[opts.blockIndex];
    processData.totalSize = 0;
    processData.downloadedSize = 0;
    await processChannelOrVideo(event, opts, processData);
    delete processes[opts.blockIndex];
  } catch (err) {
    event.reply('process-status', `❌ Ошибка обработки: ${err.message}`, undefined, opts.blockIndex);
    delete processes[opts.blockIndex];
  }
});

ipcMain.on('stop-process', (event, blockIndex) => {
  if (processes[blockIndex]) {
    processes[blockIndex].stopped = true;
  }
});

ipcMain.on('open-folder', (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.on('minimize', () => mainWindow.minimize());
ipcMain.on('maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('close', () => mainWindow.close());
ipcMain.on('resize', (event, width, height) => mainWindow.setSize(width, height, true));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
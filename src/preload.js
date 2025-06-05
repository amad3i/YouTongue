const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('youTongue', {
  processVideo: opts => ipcRenderer.send('process-video', opts),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  readFile: filePath => ipcRenderer.invoke('read-file', filePath),
  onStatus: cb => ipcRenderer.on('process-status', (_, msg, progress, blockIndex, sizeMB) => cb(msg, progress, blockIndex, sizeMB)),
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', width, height),
  lockSize: (width, height) => ipcRenderer.send('lock-size', width, height),
  stopProcess: blockIndex => ipcRenderer.send('stop-process', blockIndex),
  openFolder: path => ipcRenderer.send('open-folder', path),
});
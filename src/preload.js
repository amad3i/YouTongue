const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('youTongue', {
  processVideo: opts => ipcRenderer.send('process-video', opts),
  onStatus:     cb   => ipcRenderer.on('process-status', (_, msg) => cb(msg)),
});

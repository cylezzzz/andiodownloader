// G:\andiodownloader\andiodownloader\preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args ?? {}),
  on: (channel, listener) => {
    const sub = (_, data) => listener(data);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.off(channel, sub);
  }
});

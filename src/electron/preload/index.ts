import { contextBridge, ipcRenderer } from 'electron'

// global 객체를 window로 설정
contextBridge.exposeInMainWorld('global', window)

// 기존 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
})

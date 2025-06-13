import { ipcMain, app, shell } from 'electron'
import { appState } from './state.js'

export function registerIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion())

  // 렌더러에서 백엔드 포트를 요청하면 appState에서 값을 찾아 반환합니다.
  ipcMain.handle('get-backend-port', async () => {
    if (appState.backendPort) {
      return appState.backendPort
    }
    // 포트가 아직 설정되지 않았다면, 설정될 때까지 기다립니다.
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (appState.backendPort) {
          clearInterval(interval)
          resolve(appState.backendPort)
        }
      }, 100)
    })
  })

  // 렌더러에서 외부 URL 열기 요청을 처리합니다.
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url)
  })
}

import { ipcMain, app } from 'electron'
import { authManager } from '../managers/authManager'
import { settingsManager } from '../managers/settingsManager'

export function registerIpcHandlers() {
  // 설정 관련 IPC 핸들러
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('save-settings', (_event, data) => settingsManager.saveSettings(data))
  ipcMain.handle('load-settings', () => settingsManager.loadSettings())

  // 인증 관련 IPC 핸들러
  ipcMain.handle('login', async (_event, credentials) => authManager.login(credentials.email, credentials.password))
  ipcMain.handle('check-login-status', async (_event, params = {}) => {
    const { email = '', token = '' } = params
    if (!email || !token) {
      return { login: false, message: '로그인이 필요합니다.' }
    }
    return await authManager.checkLoginStatus(email, token)
  })

  // 네이버 로그인 브라우저 열기 IPC 핸들러
  ipcMain.handle('open-naver-login', async () => {
    const { browserManager } = require('../managers/browserManager')
    return await browserManager.launchNaverLoginBrowser()
  })

  ipcMain.handle('get-auth', async () => authManager.loadAuth())
  ipcMain.handle('save-auth', async (_event, auth) => authManager.saveAuth(auth.email, auth.token))
  ipcMain.handle('clear-auth', async () => authManager.clearAuth())
}

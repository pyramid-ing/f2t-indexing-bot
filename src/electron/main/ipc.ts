import { ipcMain, app } from 'electron'

export function registerIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion())
}

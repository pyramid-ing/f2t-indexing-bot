import { BrowserWindow } from 'electron'
import * as path from 'path'
import { AppState } from '../managers/AppState'

export function createWindow() {
  const state = AppState.getInstance()
  state.mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  if (process.env.ELECTRON_DEBUG) {
    console.log('Loading dev server at http://localhost:5173')
    state.mainWindow.loadURL('http://localhost:5173')
  } else {
    const indexPath = path.resolve(require('electron').app.getAppPath(), 'dist/renderer/index.html')
    state.mainWindow.loadFile(indexPath)
  }
}

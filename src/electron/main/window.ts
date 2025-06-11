import { BrowserWindow } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

export function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.ELECTRON_DEBUG) {
    console.log('Loading dev server at http://localhost:8080')
    mainWindow.loadURL('http://localhost:8080')
  } else {
    const indexPath = path.resolve(require('electron').app.getAppPath(), 'dist/renderer/index.html')
    mainWindow.loadFile(indexPath)
  }

  // 창이 닫힐 때 참조 제거
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_DEBUG) {
    mainWindow.webContents.openDevTools()
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

import { BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

export function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEBUG) {
    console.log('Loading dev server at http://localhost:8080')
    mainWindow.loadURL('http://localhost:8080')
  } else {
    const indexPath = path.join(__dirname, '..', 'renderer', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // 창이 닫힐 때 참조 제거
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

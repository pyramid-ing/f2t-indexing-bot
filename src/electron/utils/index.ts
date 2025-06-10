import { BrowserWindow } from 'electron'

export interface LogData {
  link?: string
  reply?: string
  data?: any
}

export type LogType = 'info' | 'error' | 'warning'

export const utils = {
  delay: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),

  sendLogToRenderer(message: string, type: 'info' | 'error' | 'warning' = 'info') {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      // type을 level로 매핑하고, warning을 warn으로 변환
      const level = type === 'warning' ? 'warn' : type

      mainWindow.webContents.send('log-message', {
        level,
        log: message,
        timestamp: new Date().toISOString(),
      } as LogData)
    }
  },
}

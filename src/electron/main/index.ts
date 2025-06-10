import { app } from 'electron'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { prisma } from '../repository/prismaClient'

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    prisma.$disconnect().finally(() => {
      app.quit()
    })
  }
})

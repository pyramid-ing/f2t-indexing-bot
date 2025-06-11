import { app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { prisma } from '../repository/prismaClient'

let nestProcess: ReturnType<typeof spawn> | null = null

app.whenReady().then(() => {
  // NestJS 서버 실행 (개발용)
  nestProcess = spawn('yarn', ['dev'], {
    cwd: path.join(__dirname, '../../../backend'), // NestJS 프로젝트 경로
    shell: true,
    stdio: 'inherit',
  })

  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    prisma.$disconnect().finally(() => {
      if (nestProcess) nestProcess.kill()
      app.quit()
    })
  }
})

import { app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'

let nestProcess: ReturnType<typeof spawn> | null = null

function setupUserDataDirectory() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'db.sqlite')

  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development'
  process.env.USER_DATA_PATH = userDataPath
  process.env.DATABASE_URL = `file:${dbPath}`

  console.log(`📁 사용자 데이터 경로: ${userDataPath}`)
  console.log(`🗃️  데이터베이스 경로: ${dbPath}`)
}

app.whenReady().then(() => {
  setupUserDataDirectory()

  if (app.isPackaged) {
    console.log('🚀 프로덕션 모드: NestJS 서버 실행')
    const backendPath = path.join(__dirname, '..', 'backend', 'main.js')
    nestProcess = spawn('node', [backendPath], {
      stdio: 'inherit',
      env: { ...process.env },
    })
  } else {
    console.log('🔧 개발 모드: NestJS 서버는 별도로 실행해주세요 (npm run dev)')
  }

  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nestProcess) nestProcess.kill()
    app.quit()
  }
})

import { app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'

let nestProcess: ReturnType<typeof spawn> | null = null

// 사용자별 데이터 디렉토리 설정
function setupUserDataDirectory() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'db.sqlite')

  // 환경변수 설정
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development'
  process.env.USER_DATA_PATH = userDataPath
  process.env.DATABASE_URL = `file:${dbPath}`

  console.log(`📁 사용자 데이터 경로: ${userDataPath}`)
  console.log(`🗃️  데이터베이스 경로: ${dbPath}`)
}

app.whenReady().then(() => {
  // 사용자별 데이터 디렉토리 설정
  setupUserDataDirectory()

  // NestJS 서버 실행 (개발용)
  nestProcess = spawn('yarn', ['start'], {
    cwd: path.join(__dirname, '../../../backend'), // NestJS 프로젝트 경로
    shell: true,
    stdio: 'inherit',
    env: { ...process.env }, // 설정된 환경변수 전달
  })

  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nestProcess) nestProcess.kill()
    app.quit()
  }
})

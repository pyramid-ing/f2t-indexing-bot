import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { appState } from './state'

let backendProcess: ChildProcess | null = null

function setupUserDataDirectory() {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'dev.db')

  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development'
  process.env.USER_DATA_PATH = userDataPath
  process.env.DATABASE_URL = `file:${dbPath}`

  console.log(`📁 사용자 데이터 경로: ${userDataPath}`)
  console.log(`🗃️  데이터베이스 경로: ${dbPath}`)
}

function startBackend() {
  return new Promise<number>((resolve, reject) => {
    // 개발 모드에서는 백엔드를 시작하지 않음
    if (!app.isPackaged) {
      console.log('개발 모드: 백엔드는 별도로 실행해야 합니다.')
      console.log(`기본 백엔드 포트: ${appState.backendPort}`)
      return resolve(appState.backendPort)
    }

    const backendPath = path.join(process.resourcesPath, 'backend', 'main.js')
    console.log(`프로덕션 모드: 백엔드 시작 (${backendPath})`)

    try {
      // 백엔드 파일이 존재하는지 확인
      const fs = require('fs')
      if (!fs.existsSync(backendPath)) {
        console.error(`❌ 백엔드 파일이 존재하지 않습니다: ${backendPath}`)
        reject(new Error(`Backend file not found: ${backendPath}`))
        return
      }

      backendProcess = spawn('node', [backendPath])

      const handleData = (data: Buffer) => {
        const output = data.toString()
        console.log(`[Backend STDOUT]: ${output.trim()}`)
        const match = output.match(/BACKEND_PORT=(\d+)/)
        if (match && match[1]) {
          const port = parseInt(match[1], 10)
          console.log(`✅ 백엔드 포트 감지: ${port}`)
          appState.backendPort = port
          resolve(port)
          backendProcess?.stdout?.removeListener('data', handleData)
        }
      }

      backendProcess.stdout?.on('data', handleData)

      backendProcess.stderr?.on('data', data => {
        console.error(`[Backend STDERR]: ${data.toString().trim()}`)
      })

      backendProcess.on('close', code => {
        console.log(`Backend process exited with code ${code}`)
        if (code !== 0 && code !== null) {
          reject(new Error(`Backend process exited with non-zero code: ${code}`))
        }
      })

      backendProcess.on('error', err => {
        console.error('[Backend ERROR]:', err)
        reject(err)
      })
    } catch (error) {
      console.error('백엔드 프로세스 시작 중 오류:', error)
      reject(error)
    }
  })
}

app.whenReady().then(async () => {
  console.log('앱 시작...')
  console.log('앱 경로:', app.getAppPath())
  console.log('리소스 경로:', process.resourcesPath)
  
  setupUserDataDirectory()

  try {
    await startBackend()
    createWindow()
    registerIpcHandlers()
  } catch (error) {
    console.error('애플리케이션 시작 실패:', error)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    console.log('앱 종료 전 백엔드 프로세스 종료')
    backendProcess.kill()
  }
})

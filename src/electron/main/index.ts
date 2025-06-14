import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { appState } from './state'
import * as fs from 'fs'

let backendProcess: ChildProcess | null = null

function setupUserDataDirectory() {
  const userDataPath = app.getPath('userData')

  // 개발 환경과 프로덕션 환경의 DB 경로 분리
  const dbPath = app.isPackaged
    ? path.join(userDataPath, 'dev.db')
    : path.join(app.getAppPath(), 'backend', 'prisma', 'db.sqlite')

  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development'
  process.env.USER_DATA_PATH = userDataPath
  process.env.DATABASE_URL = `file:${dbPath}`

  console.log('환경 설정:')
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`📁 사용자 데이터 경로: ${userDataPath}`)
  console.log(`🗃️ 데이터베이스 경로: ${dbPath}`)
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`)

  return { dbPath }
}

async function seedDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const seedPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend', 'prisma', 'seed.js')
      : path.join(app.getAppPath(), 'backend', 'prisma', 'seed.ts')

    const command = app.isPackaged ? 'node' : 'ts-node'
    const args = app.isPackaged ? [seedPath] : ['-r', 'tsconfig-paths/register', seedPath]
    const backendDir = path.join(app.getAppPath(), 'backend')

    console.log('DB 시드 실행:', command, args.join(' '))
    console.log(`작업 디렉토리: ${backendDir}`)

    const seedProcess = spawn(command, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
      },
      cwd: backendDir,
    })

    seedProcess.stdout?.on('data', data => {
      console.log(`[Seed STDOUT]: ${data.toString().trim()}`)
    })

    seedProcess.stderr?.on('data', data => {
      console.error(`[Seed STDERR]: ${data.toString().trim()}`)
    })

    seedProcess.on('close', code => {
      if (code === 0) {
        console.log('✅ DB 시드가 완료되었습니다.')
        resolve()
      } else {
        const error = new Error(`DB 시드가 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        reject(error)
      }
    })

    seedProcess.on('error', err => {
      console.error('DB 시드 중 오류:', err)
      reject(err)
    })
  })
}

function isDatabaseEmpty(dbPath: string): boolean {
  try {
    // 파일이 없으면 빈 것으로 간주
    if (!fs.existsSync(dbPath)) {
      return true
    }

    // 파일 크기가 0이면 빈 것으로 간주
    const stats = fs.statSync(dbPath)
    return stats.size === 0
  } catch (error) {
    console.error('DB 파일 확인 중 오류:', error)
    return true
  }
}

async function runPrismaMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Prisma 마이그레이션 실행 중...')

    const command = app.isPackaged ? 'prisma' : 'npx'
    const args = app.isPackaged ? ['migrate', 'deploy'] : ['prisma', 'migrate', 'deploy']
    const backendDir = path.join(app.getAppPath(), 'backend')

    console.log(`작업 디렉토리: ${backendDir}`)

    const migrationProcess = spawn(command, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
      },
      cwd: backendDir,
    })

    migrationProcess.stdout?.on('data', data => {
      console.log(`[Migration STDOUT]: ${data.toString().trim()}`)
    })

    migrationProcess.stderr?.on('data', data => {
      console.error(`[Migration STDERR]: ${data.toString().trim()}`)
    })

    migrationProcess.on('close', code => {
      if (code === 0) {
        console.log('✅ Prisma 마이그레이션이 완료되었습니다.')
        resolve()
      } else {
        const error = new Error(`Prisma 마이그레이션이 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        reject(error)
      }
    })

    migrationProcess.on('error', err => {
      console.error('Prisma 마이그레이션 중 오류:', err)
      reject(err)
    })
  })
}

async function generatePrismaClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Prisma 클라이언트 생성 중...')

    const command = app.isPackaged ? 'prisma' : 'npx'
    const args = app.isPackaged ? ['generate'] : ['prisma', 'generate']
    const backendDir = path.join(app.getAppPath(), 'backend')

    console.log(`작업 디렉토리: ${backendDir}`)

    const generateProcess = spawn(command, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
      },
      cwd: backendDir,
    })

    generateProcess.stdout?.on('data', data => {
      console.log(`[Generate STDOUT]: ${data.toString().trim()}`)
    })

    generateProcess.stderr?.on('data', data => {
      console.error(`[Generate STDERR]: ${data.toString().trim()}`)
    })

    generateProcess.on('close', code => {
      if (code === 0) {
        console.log('✅ Prisma 클라이언트가 생성되었습니다.')
        resolve()
      } else {
        const error = new Error(`Prisma 클라이언트 생성이 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        reject(error)
      }
    })

    generateProcess.on('error', err => {
      console.error('Prisma 클라이언트 생성 중 오류:', err)
      reject(err)
    })
  })
}

function startBackend() {
  return new Promise<number>((resolve, reject) => {
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend', 'dist', 'apps', 'main.js')
      : path.join(app.getAppPath(), 'backend', 'dist', 'apps', 'main.js')

    console.log(`백엔드 시작 (${backendPath})`)

    try {
      // 백엔드 파일이 존재하는지 확인
      if (!fs.existsSync(backendPath)) {
        console.error(`❌ 백엔드 파일이 존재하지 않습니다: ${backendPath}`)
        reject(new Error(`Backend file not found: ${backendPath}`))
        return
      }

      backendProcess = spawn('node', [backendPath], {
        env: {
          ...process.env,
          NODE_ENV: app.isPackaged ? 'production' : 'development',
        },
      })

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

  const { dbPath } = setupUserDataDirectory()

  try {
    // DB가 비어있으면 마이그레이션 후 시드 데이터 추가
    if (isDatabaseEmpty(dbPath)) {
      console.log('빈 DB가 감지되었습니다.')

      console.log('1. Prisma 클라이언트를 생성합니다...')
      await generatePrismaClient()

      console.log('2. Prisma 마이그레이션을 실행합니다...')
      await runPrismaMigration()

      console.log('3. 시드 데이터를 추가합니다...')
      await seedDatabase()
    }

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

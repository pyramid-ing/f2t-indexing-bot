import { app, BrowserWindow, globalShortcut } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import * as fs from 'fs'
import log from 'electron-log'

// 로그 설정
log.initialize({ preload: true })

if (process.env.NODE_ENV === 'development') {
  log.transports.file.resolvePathFn = () => path.join(process.cwd(), 'logs/main.log')
} else {
  log.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'main.log')
}

// 로그 레벨 설정
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// 로그 포맷 설정
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

// 파일 크기 제한 (10MB)
log.transports.file.maxSize = 10 * 1024 * 1024

// 로그 시작 표시
log.info('애플리케이션 시작')

let backendProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

function setupUserDataDirectory() {
  const userDataPath = app.getPath('userData')

  // 개발 환경과 프로덕션 환경의 DB 경로 분리
  const dbPath = app.isPackaged
    ? path.join(userDataPath, 'dev.db')
    : path.join(app.getAppPath(), 'backend', 'prisma', 'db.sqlite')

  // 쿠키 디렉토리 설정
  const cookieDir = app.isPackaged
    ? path.join(userDataPath, 'static', 'cookies')
    : path.join(app.getAppPath(), 'backend', 'static', 'cookies')

  // 쿠키 디렉토리가 없으면 생성
  if (!fs.existsSync(cookieDir)) {
    fs.mkdirSync(cookieDir, { recursive: true })
    log.info('쿠키 디렉토리 생성:', cookieDir)
  }

  // 시스템에 설치된 Chrome 경로 설정
  let puppeteerPath = ''
  if (app.isPackaged) {
    switch (process.platform) {
      case 'darwin': // macOS
        puppeteerPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        break
      case 'win32': // Windows
        const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files'
        puppeteerPath = path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe')
        break
      case 'linux': // Linux
        puppeteerPath = '/usr/bin/google-chrome'
        break
    }

    // Chrome 실행 파일이 존재하는지 확인
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      process.env.PUPPETEER_EXECUTABLE_PATH = puppeteerPath
      log.info('Chrome 실행 파일 경로:', puppeteerPath)
    } else {
      log.warn('시스템에 설치된 Chrome을 찾을 수 없습니다.')
    }
  }

  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development'
  process.env.USER_DATA_PATH = userDataPath
  process.env.DATABASE_URL = `file:${dbPath}`
  process.env.COOKIE_DIR = cookieDir

  console.log('환경 설정:')
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`📁 사용자 데이터 경로: ${userDataPath}`)
  console.log(`🗃️ 데이터베이스 경로: ${dbPath}`)
  console.log(`🍪 쿠키 저장 경로: ${cookieDir}`)
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`🌐 Chrome 실행 파일 경로: ${process.env.PUPPETEER_EXECUTABLE_PATH}`)
  }

  return { dbPath }
}

async function seedDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const seedPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend', 'dist', 'prisma', 'seed.js')
      : path.join(app.getAppPath(), 'backend', 'dist', 'prisma', 'seed.js')

    const nodeExecutable = app.isPackaged ? path.join(process.resourcesPath, 'node', 'bin', 'node') : process.execPath
    const args = [seedPath]
    const backendDir = path.join(app.getAppPath(), 'backend')

    log.info('[DB Seed] 시작:', nodeExecutable, args.join(' '))
    log.info('[DB Seed] 작업 디렉토리:', backendDir)
    log.info('[DB Seed] Node 실행 파일:', nodeExecutable)

    const seedProcess = spawn(nodeExecutable, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        NODE: nodeExecutable,
        PATH: `${path.dirname(nodeExecutable)}:${process.env.PATH}`,
      },
      cwd: backendDir,
    })

    seedProcess.stdout?.on('data', data => {
      const output = data.toString().trim()
      console.log(`[DB Seed]: ${output}`)
      log.info(`[DB Seed]: ${output}`)
    })

    seedProcess.stderr?.on('data', data => {
      const output = data.toString().trim()
      console.error(`[DB Seed Error]: ${output}`)
      log.error(`[DB Seed Error]: ${output}`)
    })

    seedProcess.on('close', code => {
      if (code === 0) {
        const msg = '✅ DB 시드가 완료되었습니다.'
        console.log(msg)
        log.info('[DB Seed]', msg)
        resolve()
      } else {
        const error = new Error(`DB 시드가 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        log.error('[DB Seed]', error)
        reject(error)
      }
    })

    seedProcess.on('error', err => {
      console.error('DB 시드 중 오류:', err)
      log.error('[DB Seed] 프로세스 오류:', err)
      reject(err)
    })
  })
}

function isDatabaseEmpty(dbPath: string): boolean {
  try {
    // 파일이 없으면 빈 것으로 간주
    if (!fs.existsSync(dbPath)) {
      log.info('[DB Check] 데이터베이스 파일이 없습니다:', dbPath)
      return true
    }

    // 파일 크기가 0이면 빈 것으로 간주
    const stats = fs.statSync(dbPath)
    const isEmpty = stats.size === 0
    log.info(`[DB Check] 데이터베이스 크기: ${stats.size} bytes, 비어있음: ${isEmpty}`)
    return isEmpty
  } catch (error) {
    log.error('[DB Check] 파일 확인 중 오류:', error)
    return true
  }
}

async function runPrismaMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendDir = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(app.getAppPath(), 'backend')

    const prismaPath = path.join(backendDir, 'node_modules', '.bin', 'prisma')
    const args = ['migrate', 'deploy']
    const nodeExecutable = app.isPackaged ? path.join(process.resourcesPath, 'node', 'bin', 'node') : process.execPath

    log.info('[Prisma Migration] 시작')
    log.info('[Prisma Migration] 작업 디렉토리:', backendDir)
    log.info('[Prisma Migration] Node 실행 파일:', nodeExecutable)
    log.info('[Prisma Migration] 명령어:', prismaPath, args.join(' '))

    const migrationProcess = spawn(prismaPath, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        NODE: nodeExecutable,
        PATH: `${path.dirname(nodeExecutable)}:${process.env.PATH}`,
      },
      cwd: backendDir,
    })

    migrationProcess.stdout?.on('data', data => {
      const output = data.toString().trim()
      console.log(`[Migration]: ${output}`)
      log.info(`[Migration]: ${output}`)
    })

    migrationProcess.stderr?.on('data', data => {
      const output = data.toString().trim()
      console.error(`[Migration Error]: ${output}`)
      log.error(`[Migration Error]: ${output}`)
    })

    migrationProcess.on('close', code => {
      if (code === 0) {
        const msg = '✅ Prisma 마이그레이션이 완료되었습니다.'
        console.log(msg)
        log.info('[Migration]', msg)
        resolve()
      } else {
        const error = new Error(`Prisma 마이그레이션이 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        log.error('[Migration]', error)
        reject(error)
      }
    })

    migrationProcess.on('error', err => {
      console.error('Prisma 마이그레이션 중 오류:', err)
      log.error('[Migration] 프로세스 오류:', err)
      reject(err)
    })
  })
}

async function generatePrismaClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendDir = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(app.getAppPath(), 'backend')

    const prismaPath = path.join(backendDir, 'node_modules', '.bin', 'prisma')
    const args = ['generate']
    const nodeExecutable = app.isPackaged ? path.join(process.resourcesPath, 'node', 'bin', 'node') : process.execPath

    log.info('[Prisma Generate] 시작')
    log.info('[Prisma Generate] 작업 디렉토리:', backendDir)
    log.info('[Prisma Generate] Node 실행 파일:', nodeExecutable)
    log.info('[Prisma Generate] 명령어:', prismaPath, args.join(' '))
    log.info('[Prisma Generate] DATABASE_URL:', process.env.DATABASE_URL)
    log.info('[Prisma Generate] NODE_ENV:', process.env.NODE_ENV)

    const generateProcess = spawn(prismaPath, args, {
      env: {
        ...process.env,
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        NODE: nodeExecutable,
        PATH: `${path.dirname(nodeExecutable)}:${process.env.PATH}`,
      },
      cwd: backendDir,
    })

    generateProcess.stdout?.on('data', data => {
      const output = data.toString().trim()
      console.log(`[Generate]: ${output}`)
      log.info(`[Generate]: ${output}`)
    })

    generateProcess.stderr?.on('data', data => {
      const output = data.toString().trim()
      console.error(`[Generate Error]: ${output}`)
      log.error(`[Generate Error]: ${output}`)
    })

    generateProcess.on('close', code => {
      if (code === 0) {
        const msg = '✅ Prisma 클라이언트가 생성되었습니다.'
        console.log(msg)
        log.info('[Generate]', msg)
        resolve()
      } else {
        const error = new Error(`Prisma 클라이언트 생성이 실패했습니다. (Exit code: ${code})`)
        console.error(error)
        log.error('[Generate]', error)
        reject(error)
      }
    })

    generateProcess.on('error', err => {
      console.error('Prisma 클라이언트 생성 중 오류:', err)
      log.error('[Generate] 프로세스 오류:', err)
      reject(err)
    })
  })
}

function startBackend() {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    // 백엔드 경로 (NestJS 빌드 경로)
    const backendBase = isProduction
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, '..', '..', '..', 'backend')

    const backendEntry = path.join(backendBase, 'dist', 'apps', 'main.js')

    // 로그 파일 경로 설정
    const logPath = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true })
    }
    const backendLogPath = path.join(logPath, 'backend.log')

    const nodeExecutable = app.isPackaged ? path.join(process.resourcesPath, 'node', 'bin', 'node') : 'node'

    console.log('백엔드 시작:', nodeExecutable, backendEntry)
    console.log('작업 디렉토리:', backendBase)

    backendProcess = spawn(nodeExecutable, [backendEntry], {
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // 로그 파일로 출력 리다이렉션
    const logStream = fs.createWriteStream(backendLogPath, { flags: 'a' })

    // stdout 처리
    backendProcess.stdout.on('data', data => {
      const output = data.toString().trim()
      console.log(`[Backend]: ${output}`)
      log.info(`[Backend]: ${output}`)
      logStream.write(`${output}\n`)
    })

    // stderr 처리
    backendProcess.stderr.on('data', data => {
      const output = data.toString().trim()
      console.error(`[Backend Error]: ${output}`)
      log.error(`[Backend Error]: ${output}`)
      logStream.write(`[Error] ${output}\n`)
    })

    backendProcess.on('error', error => {
      console.error('Backend process error:', error)
      log.error('Backend process error:', error)
      logStream.write(`[Process Error] ${error.toString()}\n`)
    })

    backendProcess.on('exit', (code, signal) => {
      const message = `Backend process exited with code ${code} and signal ${signal}`
      console.log(message)
      log.info(message)
      logStream.write(`[Process Exit] ${message}\n`)
      logStream.end()
    })
  } catch (error) {
    console.error('Backend 시작 실패:', error)
    log.error('Backend 시작 실패:', error)
  }
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

    // 개발자 도구 단축키 등록
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) {
        mainWindow.webContents.openDevTools()
      }
    })

    // 에러 로깅 강화
    process.on('uncaughtException', error => {
      console.error('Uncaught Exception:', error)
      log.error('Uncaught Exception:', error)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      log.error('Unhandled Rejection:', reason)
    })
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

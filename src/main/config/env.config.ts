import { app } from 'electron'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'
import { LoggerConfig } from './logger.config'

export class EnvConfig {
  public static isDev = process.env.NODE_ENV === 'development'
  public static isProd = process.env.NODE_ENV === 'production'
  public static platform = process.platform
  public static arch = process.arch
  public static isElectron = process.versions && process.versions.electron
  public static isPackaged = app?.isPackaged || false
  public static userDataPath = EnvConfig.isPackaged ? app.getPath('userData') : process.cwd()
  public static userDataCustomPath = EnvConfig.isPackaged
    ? path.join(EnvConfig.userDataPath, 'f2t')
    : path.join(process.cwd(), 'static')
  public static resourcePath = EnvConfig.isPackaged ? process.resourcesPath : process.cwd()

  // 패키지된 앱에서는 userData 폴더에 DB를 저장
  public static dbPath = EnvConfig.isPackaged ? path.join(EnvConfig.userDataCustomPath, 'app.sqlite') : './db.sqlite'

  // 초기 DB 템플릿 경로 (resources 폴더)
  public static initialDbPath = EnvConfig.isPackaged
    ? path.join(EnvConfig.resourcePath, 'resources', 'initial.sqlite')
    : './db.sqlite'

  public static dbUrl = `file:${EnvConfig.dbPath}`

  private static engineName = ''
  private static libName = ''

  public static initialize() {
    // 로거 초기화
    LoggerConfig.initialize()

    process.env.PLAYWRIGHT_BROWSERS_PATH = this.getDefaultChromePath()

    this.setupEngineNames()
    if (this.isPackaged) {
      this.setupPackagedEnvironment()
      this.initializeDatabase()
      this.initializeTrayIcon()

      LoggerConfig.info('=== Application Start ===')
      LoggerConfig.logSystemInfo()
      LoggerConfig.logEnvironmentVariables()
    }
  }

  private static setupEngineNames() {
    switch (this.platform) {
      case 'win32':
        this.engineName = `schema-engine-windows.exe`
        this.libName = `query_engine-windows.dll.node`
        break
      case 'darwin':
        this.engineName = `schema-engine-darwin-${this.arch}`
        this.libName = `libquery_engine-darwin-${this.arch === 'arm64' ? 'arm64' : 'x64'}.dylib.node`
        break
      default:
        return ''
    }
  }

  private static getDefaultChromePath(): string {
    const platform = os.platform()
    // 각 OS별 크롬 설치 가능 경로 목록
    const chromePaths: { [key: string]: string[] } = {
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      ],
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      ],
    }
    const candidates = chromePaths[platform] || []
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
    // 못 찾았을 때는 빈 문자열 반환
    return ''
  }

  private static setupPackagedEnvironment() {
    // Prisma 바이너리 경로 설정
    const enginePath = path.join(this.resourcePath, 'node_modules', '@prisma', 'engines', this.engineName)
    const libPath = path.join(this.resourcePath, 'node_modules', '@prisma', 'engines', this.libName)

    // 환경변수 설정
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = this.dbUrl
    process.env.PRISMA_QUERY_ENGINE_BINARY = enginePath
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = libPath
    process.env.COOKIE_DIR = path.join(this.userDataCustomPath, 'cookies')
    process.env.ICON_DIR = path.join(this.userDataCustomPath, 'tray_icons')
  }

  private static initializeDatabase() {
    try {
      if (this.isPackaged) {
        // 패키지된 앱에서는 최초 설치 시에만 초기 DB를 userData로 복사
        if (!fs.existsSync(this.dbPath) && fs.existsSync(this.initialDbPath)) {
          const dbDir = path.dirname(this.dbPath)
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true })
          }

          // 초기 DB를 userData로 복사
          fs.copyFileSync(this.initialDbPath, this.dbPath)
          LoggerConfig.info(`초기 데이터베이스 복사 완료: ${this.dbPath}`)
        }
      }
    } catch (error) {
      LoggerConfig.error(`데이터베이스 초기화 중 오류:`, error)
    }
  }

  private static initializeTrayIcon() {
    try {
      if (this.isPackaged) {
        const iconDir = process.env.ICON_DIR
        if (!iconDir) {
          LoggerConfig.warn('ICON_DIR 환경 변수가 설정되지 않았습니다.')
          return
        }

        // 아이콘 디렉토리 생성
        if (!fs.existsSync(iconDir)) {
          fs.mkdirSync(iconDir, { recursive: true })
        }

        // 아이콘 파일 복사
        const sourceIconPath = path.join(this.resourcePath, 'resources', 'tray_icons', 'tray-icon.png')
        const targetIconPath = path.join(iconDir, 'tray-icon.png')

        if (fs.existsSync(sourceIconPath) && !fs.existsSync(targetIconPath)) {
          fs.copyFileSync(sourceIconPath, targetIconPath)
          LoggerConfig.info(`트레이 아이콘 복사 완료: ${targetIconPath}`)
        }
      }
    } catch (error) {
      LoggerConfig.error(`트레이 아이콘 초기화 중 오류:`, error)
    }
  }

  public static getPrismaConfig() {
    return {
      isDev: this.isDev,
      isProd: this.isProd,
      platform: this.platform,
      arch: this.arch,
      dbPath: this.dbPath,
      dbUrl: this.dbUrl,
      isElectron: this.isElectron,
      isPackaged: this.isPackaged,
      resourcePath: this.resourcePath,
    }
  }
}

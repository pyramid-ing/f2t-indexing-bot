import path from 'node:path'
import { app } from 'electron'
import { LoggerConfig } from './logger.config'

export class EnvConfig {
  public static isDev = process.env.NODE_ENV === 'development'
  public static isProd = process.env.NODE_ENV === 'production'
  public static platform = process.platform
  public static arch = process.arch
  public static isElectron = process.versions && process.versions.electron
  public static isPackaged = app?.isPackaged || false
  public static userDataPath = EnvConfig.isPackaged ? app.getPath('userData') : process.cwd()
  public static resourcePath = EnvConfig.isPackaged ? process.resourcesPath : process.cwd()
  public static dbPath = EnvConfig.isPackaged ? path.join(EnvConfig.resourcePath, 'resources', 'initial.sqlite') : 'file:./db.sqlite'
  public static dbUrl = `file:${EnvConfig.dbPath}`

  private static engineName = ''
  private static libName = ''

  public static initialize() {
    // 로거 초기화
    LoggerConfig.initialize()

    this.setupEngineNames()
    if (this.isPackaged) {
      this.setupPackagedEnvironment()
    }
  }

  private static setupEngineNames() {
    switch (this.platform) {
      case 'win32':
        this.engineName = `schema-engine-windows-${this.arch}.exe`
        this.libName = `libquery_engine-windows-${this.arch}.dll.node`
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
    switch (this.platform) {
      case 'win32':
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      case 'darwin':
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      default:
        return ''
    }
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
    process.env.PUPPETEER_EXECUTABLE_PATH = this.getDefaultChromePath()
    process.env.COOKIE_DIR = path.join(this.resourcePath, 'cookies')
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
      ...(this.isPackaged && {
        enginePath: path.join(this.resourcePath, 'prisma-engines', this.engineName),
        libPath: path.join(this.resourcePath, 'prisma-engines', this.libName),
      }),
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name)

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDatabase()
  }

  private async initializeDatabase() {
    try {
      this.logger.log('🔍 데이터베이스 초기화 상태 확인 중...')

      const dbPath = this.getDatabasePath()
      const dbExists = fs.existsSync(dbPath)

      if (!dbExists) {
        this.logger.log('📦 새로운 데이터베이스 파일 생성 중...')
        await this.createDatabase()
        return
      }

      // DB가 존재하지만 설정 테이블이 비어있는지 확인
      const isInitialized = await this.checkIfInitialized()
      if (!isInitialized) {
        this.logger.log('🔧 데이터베이스 초기 설정 중...')
        await this.seedDatabase()
        return
      }

      this.logger.log('✅ 데이터베이스가 이미 초기화되어 있습니다.')
    } catch (error) {
      this.logger.error('❌ 데이터베이스 초기화 실패:', error)
      // 초기화 실패 시 재시도 또는 사용자에게 알림
      throw error
    }
  }

  private getDatabasePath(): string {
    // 운영 환경에서는 사용자 데이터 디렉토리에 DB 저장
    if (process.env.NODE_ENV === 'production') {
      const userDataPath = process.env.USER_DATA_PATH || path.join(process.cwd(), 'data')
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }
      return path.join(userDataPath, 'db.sqlite')
    }

    // 개발 환경에서는 기본 경로 사용
    return path.join(process.cwd(), 'prisma', 'db.sqlite')
  }

  private async createDatabase(): Promise<void> {
    try {
      // Prisma migrate deploy를 실행하여 스키마 적용
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: `file:${this.getDatabasePath()}` },
      })

      if (stderr && !stderr.includes('warnings')) {
        this.logger.warn('마이그레이션 경고:', stderr)
      }

      this.logger.log('✅ 데이터베이스 스키마 적용 완료')

      // 시드 데이터 삽입
      await this.seedDatabase()
    } catch (error) {
      this.logger.error('데이터베이스 생성 실패:', error)
      throw error
    }
  }

  private async seedDatabase(): Promise<void> {
    try {
      // 직접 시드 로직 실행 (ts-node 실행 대신)
      await this.runSeedLogic()
      this.logger.log('✅ 초기 데이터 삽입 완료')
    } catch (error) {
      this.logger.error('시드 데이터 삽입 실패:', error)
      throw error
    }
  }

  private async runSeedLogic(): Promise<void> {
    // 기본 설정 데이터 생성 - 자동으로 설정 완료 상태로 생성
    const defaultData = {
      appVersion: '1.0.0',
      initialized: true,
      setupCompleted: true, // 자동으로 설정 완료
      theme: 'light',
      language: 'ko',
      firstRun: false, // 첫 실행이 아닌 것으로 처리
    }

    await this.prisma.settings.upsert({
      where: { id: 1 },
      update: {
        data: JSON.stringify(defaultData),
      },
      create: {
        id: 1,
        data: JSON.stringify(defaultData),
      },
    })

    this.logger.log('✅ 기본 설정 데이터 생성 완료')
  }

  private async checkIfInitialized(): Promise<boolean> {
    try {
      // 설정 테이블 확인
      const settings = await this.prisma.settings.findFirst({
        where: { id: 1 },
      })

      if (!settings) {
        return false
      }

      const data = JSON.parse(settings.data)
      return data.initialized === true
    } catch (error) {
      // 테이블이 존재하지 않으면 초기화되지 않은 것으로 간주
      return false
    }
  }

  // 수동으로 DB 재초기화하는 메서드
  async reinitializeDatabase(): Promise<void> {
    this.logger.log('🔄 데이터베이스 재초기화 시작...')

    try {
      // 기존 DB 파일 백업
      const dbPath = this.getDatabasePath()
      if (fs.existsSync(dbPath)) {
        const backupPath = `${dbPath}.backup.${Date.now()}`
        fs.copyFileSync(dbPath, backupPath)
        this.logger.log(`📁 기존 DB 백업: ${backupPath}`)
      }

      // 재초기화
      await this.createDatabase()
      this.logger.log('✅ 데이터베이스 재초기화 완료')
    } catch (error) {
      this.logger.error('❌ 데이터베이스 재초기화 실패:', error)
      throw error
    }
  }

  // 앱 상태 확인 메서드
  async getAppStatus() {
    try {
      const settings = await this.prisma.settings.findFirst({ where: { id: 1 } })
      if (!settings) {
        return { initialized: false, setupCompleted: false }
      }

      const data = JSON.parse(settings.data)
      return {
        initialized: data.initialized || false,
        setupCompleted: data.setupCompleted || false,
        firstRun: data.firstRun || false,
        appVersion: data.appVersion || '1.0.0',
      }
    } catch (error) {
      return { initialized: false, setupCompleted: false, error: error.message }
    }
  }

  // 설정 완료 표시
  async markSetupCompleted() {
    try {
      const settings = await this.prisma.settings.findFirst({ where: { id: 1 } })
      if (settings) {
        const data = JSON.parse(settings.data)
        data.setupCompleted = true
        data.firstRun = false

        await this.prisma.settings.update({
          where: { id: 1 },
          data: { data: JSON.stringify(data) },
        })
      }
    } catch (error) {
      this.logger.error('설정 완료 표시 실패:', error)
      throw error
    }
  }

  // 전역 엔진 설정 관련 메서드들
  async getGlobalEngineSettings() {
    try {
      const settings = await this.prisma.settings.findFirst({ where: { id: 2 } })
      if (!settings) {
        // 기본 전역 설정 생성
        const defaultGlobalSettings = {
          google: {
            use: false,
            serviceAccountEmail: '',
            privateKey: '',
            oauth2ClientId: '',
            oauth2ClientSecret: '',
            oauth2AccessToken: '',
            oauth2RefreshToken: '',
          },
          bing: { use: false, apiKey: '' },
          naver: { use: false, naverId: '', password: '' },
          daum: { use: false, siteUrl: '', password: '' },
        }

        await this.prisma.settings.create({
          data: {
            id: 2,
            data: JSON.stringify(defaultGlobalSettings),
          },
        })

        return defaultGlobalSettings
      }

      return JSON.parse(settings.data)
    } catch (error) {
      this.logger.error('전역 엔진 설정 조회 실패:', error)
      throw error
    }
  }

  async updateGlobalGoogleSettings(googleSettings: any) {
    try {
      const settings = await this.getGlobalEngineSettings()
      settings.google = { ...settings.google, ...googleSettings }

      await this.prisma.settings.upsert({
        where: { id: 2 },
        update: { data: JSON.stringify(settings) },
        create: { id: 2, data: JSON.stringify(settings) },
      })
    } catch (error) {
      this.logger.error('Google 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  async updateGlobalBingSettings(bingSettings: any) {
    try {
      const settings = await this.getGlobalEngineSettings()
      settings.bing = { ...settings.bing, ...bingSettings }

      await this.prisma.settings.upsert({
        where: { id: 2 },
        update: { data: JSON.stringify(settings) },
        create: { id: 2, data: JSON.stringify(settings) },
      })
    } catch (error) {
      this.logger.error('Bing 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  async updateGlobalNaverSettings(naverSettings: any) {
    try {
      const settings = await this.getGlobalEngineSettings()
      settings.naver = { ...settings.naver, ...naverSettings }

      await this.prisma.settings.upsert({
        where: { id: 2 },
        update: { data: JSON.stringify(settings) },
        create: { id: 2, data: JSON.stringify(settings) },
      })
    } catch (error) {
      this.logger.error('Naver 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  async updateGlobalDaumSettings(daumSettings: any) {
    try {
      const settings = await this.getGlobalEngineSettings()
      settings.daum = { ...settings.daum, ...daumSettings }

      await this.prisma.settings.upsert({
        where: { id: 2 },
        update: { data: JSON.stringify(settings) },
        create: { id: 2, data: JSON.stringify(settings) },
      })
    } catch (error) {
      this.logger.error('Daum 전역 설정 업데이트 실패:', error)
      throw error
    }
  }
}

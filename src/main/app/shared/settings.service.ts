import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/main/app/shared/prisma.service'

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(private readonly prisma: PrismaService) {}

  // 전역 엔진 설정 조회
  async getGlobalEngineSettings() {
    try {
      const settings = await (this.prisma as any).settings.findFirst({ where: { id: 2 } })
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
            oauth2TokenExpiry: '',
          },
          bing: { use: false, apiKey: '' },
          naver: { use: false, naverId: '', password: '', headless: true },
          daum: { use: false, siteUrl: '', password: '', headless: true },
        }

        await (this.prisma as any).settings.create({
          data: {
            id: 2,
            data: JSON.stringify(defaultGlobalSettings),
          },
        })

        return defaultGlobalSettings
      }

      return JSON.parse(settings.data)
    }
    catch (error) {
      this.logger.error('전역 엔진 설정 조회 실패:', error)
      throw error
    }
  }

  // Google 전역 설정 업데이트
  async updateGlobalGoogleSettings(settings: any) {
    try {
      const currentSettings = await this.getGlobalEngineSettings()
      const updatedSettings = {
        ...currentSettings,
        google: { ...currentSettings.google, ...settings },
      }

      await (this.prisma as any).settings.upsert({
        where: { id: 2 },
        create: {
          id: 2,
          data: JSON.stringify(updatedSettings),
        },
        update: {
          data: JSON.stringify(updatedSettings),
        },
      })

      this.logger.log('Google 전역 설정 업데이트 완료')
    }
    catch (error) {
      this.logger.error('Google 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  // Bing 전역 설정 업데이트
  async updateGlobalBingSettings(settings: any) {
    try {
      const currentSettings = await this.getGlobalEngineSettings()
      const updatedSettings = {
        ...currentSettings,
        bing: { ...currentSettings.bing, ...settings },
      }

      await (this.prisma as any).settings.upsert({
        where: { id: 2 },
        create: {
          id: 2,
          data: JSON.stringify(updatedSettings),
        },
        update: {
          data: JSON.stringify(updatedSettings),
        },
      })

      this.logger.log('Bing 전역 설정 업데이트 완료')
    }
    catch (error) {
      this.logger.error('Bing 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  // Naver 전역 설정 업데이트
  async updateGlobalNaverSettings(settings: any) {
    try {
      const currentSettings = await this.getGlobalEngineSettings()
      const updatedSettings = {
        ...currentSettings,
        naver: { ...currentSettings.naver, ...settings },
      }

      await (this.prisma as any).settings.upsert({
        where: { id: 2 },
        create: {
          id: 2,
          data: JSON.stringify(updatedSettings),
        },
        update: {
          data: JSON.stringify(updatedSettings),
        },
      })

      this.logger.log('Naver 전역 설정 업데이트 완료')
    }
    catch (error) {
      this.logger.error('Naver 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  // Daum 전역 설정 업데이트
  async updateGlobalDaumSettings(settings: any) {
    try {
      const currentSettings = await this.getGlobalEngineSettings()
      const updatedSettings = {
        ...currentSettings,
        daum: { ...currentSettings.daum, ...settings },
      }

      await (this.prisma as any).settings.upsert({
        where: { id: 2 },
        create: {
          id: 2,
          data: JSON.stringify(updatedSettings),
        },
        update: {
          data: JSON.stringify(updatedSettings),
        },
      })

      this.logger.log('Daum 전역 설정 업데이트 완료')
    }
    catch (error) {
      this.logger.error('Daum 전역 설정 업데이트 실패:', error)
      throw error
    }
  }

  // 앱 상태 조회
  async getAppStatus() {
    try {
      const settings = await (this.prisma as any).settings.findFirst({ where: { id: 1 } })
      if (!settings) {
        const defaultSettings = {
          appVersion: '1.0.0',
          initialized: true,
          setupCompleted: false,
          theme: 'light',
          language: 'ko',
        }

        await (this.prisma as any).settings.create({
          data: {
            id: 1,
            data: JSON.stringify(defaultSettings),
          },
        })

        return defaultSettings
      }

      return JSON.parse(settings.data)
    }
    catch (error) {
      this.logger.error('앱 상태 조회 실패:', error)
      throw error
    }
  }
}

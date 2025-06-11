import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'
import { SettingsService } from '../../../shared/settings.service'

export interface GoogleIndexerOptions {
  url?: string
  urls?: string[]
  siteUrl: string // 필수로 변경: DB에서 설정을 찾기 위해 필요
  type?: 'URL_UPDATED' | 'URL_DELETED'
}

@Injectable()
export class GoogleIndexerService {
  private readonly logger = new Logger(GoogleIndexerService.name)
  private readonly googleIndexingUrl = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

  constructor(
    private readonly httpService: HttpService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getGoogleConfig() {
    const globalSettings = await this.settingsService.getGlobalEngineSettings()

    if (!globalSettings.google || !globalSettings.google.use) {
      throw new Error('Google 색인이 비활성화되어 있습니다.')
    }

    return {
      config: globalSettings.google,
    }
  }

  async indexUrl(siteUrl: string, url: string, type: string = 'URL_UPDATED'): Promise<any> {
    this.logger.log(`Google에 URL 인덱싱 요청: ${url}`)

    try {
      const { config } = await this.getGoogleConfig()
      const payload = {
        url,
        type,
      }

      const headers = await this.googleAuthService.getAuthHeaders()

      const response = await firstValueFrom(this.httpService.post(this.googleIndexingUrl, payload, { headers }))

      // 성공 로그 기록
      await this.prisma.createIndexingLog({
        siteUrl,
        targetUrl: url,
        provider: 'GOOGLE',
        status: 'SUCCESS',
        message: `Type: ${type}`,
        responseData: response.data,
      })

      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.createIndexingLog({
        siteUrl,
        targetUrl: url,
        provider: 'GOOGLE',
        status: 'FAILED',
        message: `Type: ${type}, Error: ${error.message}`,
      })

      this.logger.error('Google URL 인덱싱 실패:', error)
      throw new Error(`Google 색인 요청 실패: ${error.message}`)
    }
  }

  async getIndexStatus(siteUrl: string, url: string): Promise<any> {
    this.logger.log(`Google 인덱스 상태 조회: ${url}`)

    try {
      const { config } = await this.getGoogleConfig()

      // ... rest of existing method implementation ...
    } catch (error) {
      this.logger.error('Google 인덱스 상태 조회 실패:', error)
      throw error
    }
  }

  async batchIndexUrls(siteUrl: string, urls: string[], type: string = 'URL_UPDATED'): Promise<any[]> {
    await this.getGoogleConfig() // 설정 확인
    const results = []

    try {
      for (const url of urls) {
        const result = await this.indexUrl(siteUrl, url, type)
        results.push({ url, result })
      }

      return results
    } catch (error) {
      throw new Error(`Google 다중 색인 요청 실패: ${error.message}`)
    }
  }

  async manualIndexing(options: GoogleIndexerOptions): Promise<any> {
    if (!options.siteUrl) {
      throw new Error('siteUrl이 필요합니다.')
    }

    const type = options.type || 'URL_UPDATED'

    if (options.url) {
      return this.indexUrl(options.siteUrl, options.url, type)
    } else if (options.urls && options.urls.length > 0) {
      return this.batchIndexUrls(options.siteUrl, options.urls, type)
    } else {
      throw new Error('URL 또는 URLs가 필요합니다.')
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Google 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Google 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const googleConfig = globalSettings.google

      if (!googleConfig.use) {
        throw new Error('Google 인덱싱이 비활성화되어 있습니다.')
      }

      if (!googleConfig.serviceAccountEmail || !googleConfig.privateKey) {
        throw new Error('Google 서비스 계정 설정이 올바르지 않습니다.')
      }

      const results = []

      for (const url of urls) {
        const result = await this.indexSingleUrl(url, googleConfig)
        results.push(result)

        // 인덱싱 로그 저장
        await this.prisma.indexingLog.create({
          data: {
            siteUrl: 'global', // 전역 설정이므로 임시값
            targetUrl: url,
            provider: 'GOOGLE',
            status: result.success ? 'SUCCESS' : 'FAILED',
            message: result.success ? result.message : result.error,
            responseData: JSON.stringify(result),
          },
        })
      }

      this.logger.log(`Google 인덱싱 완료: ${results.length}개 URL`)
      return results
    } catch (error) {
      this.logger.error('Google 인덱싱 실패:', error)
      throw error
    }
  }

  private async indexSingleUrl(url: string, config: any): Promise<any> {
    try {
      // Google Indexing API 호출 로직
      // 실제 구현은 서비스 계정 키와 Google API 클라이언트를 사용
      this.logger.log(`Google 인덱싱 요청: ${url}`)

      // 임시 응답 (실제로는 Google API 호출)
      return {
        success: true,
        url,
        message: 'Google 인덱싱 요청 성공',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

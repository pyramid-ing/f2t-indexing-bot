import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'
import { SettingsService } from '../../../shared/settings.service'
import { GoogleIndexerError, GoogleConfigError, GoogleAuthError } from '@prd/apps/filters/error.types'

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
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()

      if (!globalSettings.google || !globalSettings.google.use) {
        throw new GoogleConfigError('Google 색인이 비활성화되어 있습니다.', 'getGoogleConfig', 'indexing_service', {
          enabled: false,
        })
      }

      const config = globalSettings.google

      if (!config.serviceAccountEmail || !config.privateKey) {
        throw new GoogleConfigError(
          'Google 서비스 계정 설정이 올바르지 않습니다.',
          'getGoogleConfig',
          'service_account',
          {
            hasServiceAccountEmail: !!config.serviceAccountEmail,
            hasPrivateKey: !!config.privateKey,
          },
        )
      }

      return { config }
    } catch (error) {
      if (error instanceof GoogleConfigError) {
        throw error
      }
      throw new GoogleConfigError(`Google 설정 조회 실패: ${error.message}`, 'getGoogleConfig', 'settings_fetch')
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

      let headers
      try {
        headers = await this.googleAuthService.getAuthHeaders()
      } catch (error) {
        throw new GoogleAuthError(`Google 인증 헤더 생성 실패: ${error.message}`, 'getAuthHeaders', {
          url,
          siteUrl,
          type,
        })
      }

      const response = await firstValueFrom(this.httpService.post(this.googleIndexingUrl, payload, { headers }))

      // 성공 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteUrl,
          targetUrl: url,
          provider: 'GOOGLE',
          status: 'SUCCESS',
          message: `Type: ${type}`,
          responseData: response.data,
        },
      })

      this.logger.log(`Google URL 인덱싱 성공: ${url}`)
      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteUrl,
          targetUrl: url,
          provider: 'GOOGLE',
          status: 'FAILED',
          message: `Type: ${type}, Error: ${error.message}`,
        },
      })

      this.logger.error(`Google URL 인덱싱 실패: ${url}`, error)

      if (error instanceof GoogleAuthError || error instanceof GoogleConfigError) {
        throw error
      }

      // HTTP 응답 에러 분석
      if (error.response?.status === 401) {
        throw new GoogleAuthError('Google API 인증이 실패했습니다. 토큰을 확인해주세요.', 'indexUrl', {
          url,
          siteUrl,
          type,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new GoogleIndexerError(
          'Google Indexing API 권한이 없습니다. 서비스 계정 권한을 확인해주세요.',
          'indexUrl',
          url,
          siteUrl,
          { type, responseStatus: 403, responseData: error.response?.data },
        )
      } else if (error.response?.status === 429) {
        throw new GoogleIndexerError(
          'Google API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'indexUrl',
          url,
          siteUrl,
          { type, responseStatus: 429, responseData: error.response?.data },
        )
      }

      throw new GoogleIndexerError(`Google 색인 요청 실패: ${error.message}`, 'indexUrl', url, siteUrl, {
        type,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        axiosCode: error.code,
      })
    }
  }

  async getIndexStatus(siteUrl: string, url: string): Promise<any> {
    this.logger.log(`Google 인덱스 상태 조회: ${url}`)

    try {
      const { config } = await this.getGoogleConfig()

      // Google Search Console API로 상태 조회 로직 구현
      // 실제 구현에서는 Search Console API를 사용
      this.logger.log(`Google 인덱스 상태 조회 완료: ${url}`)

      return {
        url,
        indexStatus: 'UNKNOWN', // 실제로는 API 응답에서 가져옴
        lastCrawlTime: null,
        coverageState: 'UNKNOWN',
      }
    } catch (error) {
      this.logger.error(`Google 인덱스 상태 조회 실패: ${url}`, error)

      if (error instanceof GoogleAuthError || error instanceof GoogleConfigError) {
        throw error
      }

      throw new GoogleIndexerError(`Google 인덱스 상태 조회 실패: ${error.message}`, 'getIndexStatus', url, siteUrl, {
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      })
    }
  }

  async batchIndexUrls(siteUrl: string, urls: string[], type: string = 'URL_UPDATED'): Promise<any[]> {
    await this.getGoogleConfig() // 설정 확인
    const results = []

    try {
      for (const url of urls) {
        try {
          const result = await this.indexUrl(siteUrl, url, type)
          results.push({ url, success: true, result })
        } catch (error) {
          results.push({
            url,
            success: false,
            error: {
              code: error.code || 'UNKNOWN_ERROR',
              message: error.message,
              service: error.service || 'Google Indexer',
              operation: error.operation || 'batchIndexUrls',
            },
          })
        }
      }

      return results
    } catch (error) {
      if (error instanceof GoogleAuthError || error instanceof GoogleConfigError) {
        throw error
      }

      throw new GoogleIndexerError(
        `Google 다중 색인 요청 실패: ${error.message}`,
        'batchIndexUrls',
        undefined,
        siteUrl,
        { urlCount: urls.length, type },
      )
    }
  }

  async manualIndexing(options: GoogleIndexerOptions): Promise<any> {
    if (!options.siteUrl) {
      throw new GoogleIndexerError('siteUrl이 필요합니다.', 'manualIndexing', undefined, undefined, {
        providedOptions: options,
      })
    }

    const type = options.type || 'URL_UPDATED'

    if (options.url) {
      return this.indexUrl(options.siteUrl, options.url, type)
    } else if (options.urls && options.urls.length > 0) {
      return this.batchIndexUrls(options.siteUrl, options.urls, type)
    } else {
      throw new GoogleIndexerError('URL 또는 URLs가 필요합니다.', 'manualIndexing', undefined, options.siteUrl, {
        providedOptions: options,
      })
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Google 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Google 설정 조회
      const { config } = await this.getGoogleConfig()

      const results = []

      for (const url of urls) {
        const result = await this.indexSingleUrl(url, config)
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

      if (
        error instanceof GoogleAuthError ||
        error instanceof GoogleConfigError ||
        error instanceof GoogleIndexerError
      ) {
        throw error
      }

      throw new GoogleIndexerError(`Google 인덱싱 실패: ${error.message}`, 'indexUrls', undefined, 'global', {
        urlCount: urls.length,
      })
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

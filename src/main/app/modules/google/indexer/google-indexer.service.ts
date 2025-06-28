import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { GoogleAuthService } from '@main/app/shared/google-auth.service'
import { PrismaService } from '@main/app/shared/prisma.service'
import { GoogleAuthError, GoogleConfigError, GoogleIndexerError } from '@main/filters/error.types'
import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { IndexProvider, IndexStatus } from '@prisma/client'
import { firstValueFrom } from 'rxjs'

export interface GoogleIndexerOptions {
  url?: string
  urls?: string[]
  siteId: number // siteUrl 대신 siteId 사용
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
    private readonly siteConfigService: SiteConfigService,
  ) {}

  private async getGoogleConfigForSite(siteId: number) {
    try {
      const siteConfig = await this.siteConfigService.getSiteConfig(siteId)

      if (!siteConfig.googleConfig || !siteConfig.googleConfig.use) {
        throw new GoogleConfigError(
          'Google 색인이 비활성화되어 있습니다.',
          'getGoogleConfigForSite',
          'indexing_service',
          {
            enabled: false,
            siteId,
          },
        )
      }

      const config = siteConfig.googleConfig

      if (!config.serviceAccountJson) {
        throw new GoogleConfigError(
          'Google Service Account JSON 설정이 필요합니다.',
          'getGoogleConfigForSite',
          'service_account',
          {
            hasServiceAccountJson: !!config.serviceAccountJson,
            siteId,
          },
        )
      }

      // Service Account JSON 유효성 검사
      try {
        JSON.parse(config.serviceAccountJson)
      } catch (error) {
        throw new GoogleConfigError(
          'Google Service Account JSON 형식이 올바르지 않습니다.',
          'getGoogleConfigForSite',
          'service_account',
          {
            parseError: error.message,
            siteId,
          },
        )
      }

      return { config, siteConfig }
    } catch (error) {
      if (error instanceof GoogleConfigError) {
        throw error
      }
      throw new GoogleConfigError(
        `Google 설정 조회 실패: ${error.message}`,
        'getGoogleConfigForSite',
        'settings_fetch',
        { siteId },
      )
    }
  }

  async indexUrl(siteId: number, url: string, type: string = 'URL_UPDATED'): Promise<any> {
    this.logger.log(`Google에 URL 인덱싱 요청: ${url} (Site ID: ${siteId})`)

    try {
      const { config } = await this.getGoogleConfigForSite(siteId)
      const payload = {
        url,
        type,
      }

      let headers
      try {
        headers = await this.googleAuthService.getAuthHeaders(config.serviceAccountJson)
      } catch (error) {
        throw new GoogleAuthError(`Google 인증 헤더 생성 실패: ${error.message}`, 'getAuthHeaders', {
          url,
          siteId,
          type,
        })
      }

      const response = await firstValueFrom(this.httpService.post(this.googleIndexingUrl, payload, { headers }))

      // 성공 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteId,
          targetUrl: url,
          provider: IndexProvider.GOOGLE,
          status: IndexStatus.SUCCESS,
          message: `Type: ${type}`,
          responseData: JSON.stringify(response.data),
        },
      })

      this.logger.log(`Google URL 인덱싱 성공: ${url}`)
      return response.data
    } catch (error) {
      this.logger.error(`Google 색인 요청 실패: ${error.message}`, error.stack)

      // 실패 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteId,
          targetUrl: url,
          provider: IndexProvider.GOOGLE,
          status: IndexStatus.FAILED,
          message: error.message,
          responseData: JSON.stringify(error.response?.data || {}),
        },
      })

      if (error instanceof GoogleAuthError || error instanceof GoogleConfigError) {
        throw error
      }

      // HTTP 응답 에러 분석
      if (error.response?.status === 401) {
        throw new GoogleAuthError('Google API 인증이 실패했습니다. 토큰을 확인해주세요.', 'indexUrl', {
          url,
          siteId,
          type,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new GoogleIndexerError(
          'Google Indexing API 권한이 없습니다. 서비스 계정 권한을 확인해주세요.',
          'indexUrl',
          url,
          siteId.toString(),
          { type, responseStatus: 403, responseData: error.response?.data },
        )
      } else if (error.response?.status === 429) {
        throw new GoogleIndexerError(
          'Google API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'indexUrl',
          url,
          siteId.toString(),
          { type, responseStatus: 429, responseData: error.response?.data },
        )
      }

      throw new GoogleIndexerError(`Google 색인 요청 실패: ${error.message}`, 'indexUrl', url, siteId.toString(), {
        type,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        axiosCode: error.code,
      })
    }
  }

  async getIndexStatus(siteId: number, url: string): Promise<any> {
    this.logger.log(`Google 인덱스 상태 조회: ${url} (Site ID: ${siteId})`)

    try {
      const { config } = await this.getGoogleConfigForSite(siteId)

      let headers
      try {
        headers = await this.googleAuthService.getAuthHeaders(config.serviceAccountJson)
      } catch (error) {
        throw new GoogleAuthError(`Google 인증 헤더 생성 실패: ${error.message}`, 'getAuthHeaders', {
          url,
          siteId,
        })
      }

      const response = await firstValueFrom(
        this.httpService.get(
          `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`,
          {
            headers,
          },
        ),
      )

      this.logger.log(`Google 인덱스 상태 조회 성공: ${url}`)
      return response.data
    } catch (error) {
      this.logger.error(`Google 인덱스 상태 조회 실패: ${error.message}`, error.stack)

      if (error instanceof GoogleAuthError || error instanceof GoogleConfigError) {
        throw error
      }

      if (error.response?.status === 404) {
        return { status: 'NOT_INDEXED', message: '인덱스되지 않은 URL입니다.' }
      }

      throw new GoogleIndexerError(
        `Google 인덱스 상태 조회 실패: ${error.message}`,
        'getIndexStatus',
        url,
        siteId.toString(),
        {
          responseStatus: error.response?.status,
          responseData: error.response?.data,
        },
      )
    }
  }

  async batchIndexUrls(siteId: number, urls: string[], type: string = 'URL_UPDATED'): Promise<any> {
    this.logger.log(`Google 배치 URL 인덱싱 시작: ${urls.length}개 URL (Site ID: ${siteId})`)

    const allResults = []
    const concurrencyLimit = 3
    const delayBetweenRequests = 1000

    // URLs를 청크로 나누기
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const chunk = urls.slice(i, i + concurrencyLimit)
      const chunkPromises = chunk.map(url => this.indexUrl(siteId, url, type))

      try {
        const chunkResults = await Promise.allSettled(chunkPromises)
        allResults.push(...chunkResults)

        // 마지막 청크가 아니면 지연
        if (i + concurrencyLimit < urls.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
      } catch (error) {
        this.logger.error(`배치 인덱싱 청크 실패 (${i}-${i + chunk.length}):`, error)
      }
    }

    // Promise.allSettled 결과를 성공/실패로 분리해서 처리
    const successResults = []
    const failedResults = []

    allResults.forEach((result, index) => {
      const targetUrl = urls[index]

      if (result.status === 'fulfilled') {
        // 성공한 경우
        successResults.push({
          url: targetUrl,
          status: 'success',
          data: result.value,
        })
      } else {
        // 실패한 경우
        failedResults.push({
          url: targetUrl,
          status: 'failed',
          error: result.reason?.message || '알 수 없는 오류',
          errorDetails: result.reason,
        })
      }
    })

    const summary = {
      total: urls.length,
      success: successResults.length,
      failed: failedResults.length,
      successUrls: successResults,
      failedUrls: failedResults,
    }

    this.logger.log(
      `Google 배치 URL 인덱싱 완료: 총 ${urls.length}개 중 성공 ${successResults.length}개, 실패 ${failedResults.length}개`,
    )

    // 모든 URL이 성공한 경우 성공 응답 반환
    if (failedResults.length === 0) {
      return {
        success: true,
        message: `모든 URL(${successResults.length}개)이 성공적으로 색인되었습니다.`,
        data: summary,
      }
    }

    // 일부 실패가 있는 경우
    if (successResults.length > 0) {
      return {
        success: true, // 부분 성공으로 처리
        message: `${successResults.length}개 URL 성공, ${failedResults.length}개 URL 실패`,
        data: summary,
      }
    }

    // 모든 URL이 실패한 경우 에러 반환
    throw new GoogleIndexerError(
      `모든 URL 색인이 실패했습니다.`,
      'batchIndexUrls',
      urls.join(', '),
      siteId.toString(),
      { summary },
    )
  }

  async manualIndexing(options: GoogleIndexerOptions): Promise<any> {
    const { url, urls, siteId, type = 'URL_UPDATED' } = options

    if (!siteId) {
      throw new GoogleIndexerError('Site ID가 필요합니다.', 'manualIndexing', '', '0', { options })
    }

    // 단일 URL 처리
    if (url) {
      return await this.indexUrl(siteId, url, type)
    }

    // 다중 URL 처리
    if (urls && urls.length > 0) {
      return await this.batchIndexUrls(siteId, urls, type)
    }

    throw new GoogleIndexerError('처리할 URL이 제공되지 않았습니다.', 'manualIndexing', '', siteId.toString(), {
      options,
    })
  }

  // 레거시 호환성을 위한 메서드 (필요한 경우)
  async indexUrls(urls: string[], siteId?: number): Promise<any> {
    if (!siteId) {
      throw new GoogleIndexerError('Site ID가 필요합니다.', 'indexUrls', '', '0', { urls })
    }

    return await this.batchIndexUrls(siteId, urls)
  }
}

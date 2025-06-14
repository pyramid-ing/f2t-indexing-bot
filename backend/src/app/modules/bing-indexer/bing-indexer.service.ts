import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '@prd/app/shared/prisma.service'
import { SettingsService } from '@prd/app/shared/settings.service'
import { BingAuthError, BingSubmissionError, BingConfigError } from '@prd/filters/error.types'

export interface BingIndexerOptions {
  url?: string
  urls?: string[]
  siteUrl: string
}

interface BingSubmitPayload {
  siteUrl: string
  urlList: string[]
}

@Injectable()
export class BingIndexerService {
  private readonly bingApiUrl = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch'
  private readonly logger = new Logger(BingIndexerService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private async getBingConfig() {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()

      if (!globalSettings.bing || !globalSettings.bing.use) {
        throw new BingConfigError('Bing 색인이 비활성화되어 있습니다.', 'getBingConfig', 'indexing_service', {
          enabled: false,
        })
      }

      if (!globalSettings.bing.apiKey) {
        throw new BingConfigError('Bing API 키가 설정되지 않았습니다.', 'getBingConfig', 'api_key', {
          hasApiKey: false,
        })
      }

      return {
        apiKey: globalSettings.bing.apiKey,
      }
    } catch (error) {
      if (error instanceof BingConfigError) {
        throw error
      }
      throw new BingConfigError(`Bing 설정 조회 실패: ${error.message}`, 'getBingConfig', 'settings_fetch')
    }
  }

  private createPayload(siteUrl: string, urls: string[]): BingSubmitPayload {
    return {
      siteUrl,
      urlList: urls,
    }
  }

  async submitUrlToBing(siteUrl: string, url: string): Promise<any> {
    try {
      const config = await this.getBingConfig()
      const payload = this.createPayload(siteUrl, [url])

      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${config.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      // 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteUrl,
          targetUrl: url,
          provider: 'BING',
          status: 'SUCCESS',
          responseData: JSON.stringify(response.data),
        },
      })

      if (response.data && response.data.d && response.data.d.ErrorCode) {
        throw new BingSubmissionError(`Bing API 오류: ${response.data.d.Message}`, 'submitUrlToBing', url, siteUrl, {
          errorCode: response.data.d.ErrorCode,
          errorMessage: response.data.d.Message,
          responseData: response.data,
        })
      }

      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteUrl,
          targetUrl: url,
          provider: 'BING',
          status: 'FAILED',
          message: error.message,
          responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
        },
      })

      if (error instanceof BingConfigError) {
        throw error
      }

      // HTTP 응답 에러 분석
      if (error.response?.status === 401) {
        throw new BingAuthError('Bing API 인증이 실패했습니다. API 키를 확인해주세요.', 'submitUrlToBing', {
          url,
          siteUrl,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new BingSubmissionError(
          'Bing API 권한이 없습니다. 사이트 등록 및 API 키 권한을 확인해주세요.',
          'submitUrlToBing',
          url,
          siteUrl,
          { responseStatus: 403, responseData: error.response?.data },
        )
      } else if (error.response?.status === 429) {
        throw new BingSubmissionError(
          'Bing API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'submitUrlToBing',
          url,
          siteUrl,
          { responseStatus: 429, responseData: error.response?.data },
        )
      }

      throw new BingSubmissionError(`Bing 색인 요청 실패: ${error.message}`, 'submitUrlToBing', url, siteUrl, {
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        axiosCode: error.code,
      })
    }
  }

  async submitMultipleUrlsToBing(siteUrl: string, urls: string[]): Promise<any> {
    try {
      const config = await this.getBingConfig()
      const payload = this.createPayload(siteUrl, urls)

      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${config.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      if (response.data && response.data.d && response.data.d.ErrorCode) {
        throw new BingSubmissionError(
          `Bing API 오류: ${response.data.d.Message}`,
          'submitMultipleUrlsToBing',
          undefined,
          siteUrl,
          {
            urlCount: urls.length,
            errorCode: response.data.d.ErrorCode,
            errorMessage: response.data.d.Message,
            responseData: response.data,
          },
        )
      }

      // 각 URL마다 성공 로그 기록
      for (const url of urls) {
        await this.prisma.indexingLog.create({
          data: {
            siteUrl,
            targetUrl: url,
            provider: 'BING',
            status: 'SUCCESS',
            responseData: JSON.stringify(response.data),
          },
        })
      }

      return response.data
    } catch (error) {
      // 각 URL마다 실패 로그 기록
      for (const url of urls) {
        await this.prisma.indexingLog.create({
          data: {
            siteUrl,
            targetUrl: url,
            provider: 'BING',
            status: 'FAILED',
            message: error.message,
            responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
          },
        })
      }

      if (error instanceof BingConfigError) {
        throw error
      }

      // HTTP 응답 에러 분석
      if (error.response?.status === 401) {
        throw new BingAuthError('Bing API 인증이 실패했습니다. API 키를 확인해주세요.', 'submitMultipleUrlsToBing', {
          urlCount: urls.length,
          siteUrl,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new BingSubmissionError(
          'Bing API 권한이 없습니다. 사이트 등록 및 API 키 권한을 확인해주세요.',
          'submitMultipleUrlsToBing',
          undefined,
          siteUrl,
          {
            urlCount: urls.length,
            responseStatus: 403,
            responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
          },
        )
      } else if (error.response?.status === 429) {
        throw new BingSubmissionError(
          'Bing API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'submitMultipleUrlsToBing',
          undefined,
          siteUrl,
          {
            urlCount: urls.length,
            responseStatus: 429,
            responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
          },
        )
      }

      throw new BingSubmissionError(
        `Bing 다중 색인 요청 실패: ${error.message}`,
        'submitMultipleUrlsToBing',
        undefined,
        siteUrl,
        {
          urlCount: urls.length,
          responseStatus: error.response?.status,
          responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
          axiosCode: error.code,
        },
      )
    }
  }

  async manualIndexing(options: BingIndexerOptions): Promise<any> {
    if (!options.siteUrl) {
      throw new BingSubmissionError('siteUrl이 필요합니다.', 'manualIndexing', undefined, undefined, {
        providedOptions: options,
      })
    }

    if (options.url) {
      return this.submitUrlToBing(options.siteUrl, options.url)
    } else if (options.urls && options.urls.length > 0) {
      return this.submitMultipleUrlsToBing(options.siteUrl, options.urls)
    } else {
      throw new BingSubmissionError('URL 또는 URLs가 필요합니다.', 'manualIndexing', undefined, options.siteUrl, {
        providedOptions: options,
      })
    }
  }

  async getUrlInfo(siteUrl: string, urls: string[]): Promise<any> {
    this.logger.log(`Bing URL 상태 조회: ${siteUrl}`)

    try {
      const config = await this.getBingConfig()

      // ... rest of the existing method implementation ...
    } catch (error) {
      this.logger.error('Bing URL 상태 조회 실패:', error)

      if (error instanceof BingConfigError || error instanceof BingAuthError) {
        throw error
      }

      throw new BingSubmissionError(`Bing URL 상태 조회 실패: ${error.message}`, 'getUrlInfo', undefined, siteUrl, {
        urlCount: urls.length,
        responseStatus: error.response?.status,
        responseData: error.response?.data ? JSON.stringify(error.response.data) : null,
      })
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Bing 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Bing 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const bingConfig = globalSettings.bing

      if (!bingConfig.use) {
        throw new BingConfigError('Bing 인덱싱이 비활성화되어 있습니다.', 'indexUrls', 'indexing_service', {
          enabled: false,
        })
      }

      if (!bingConfig.apiKey) {
        throw new BingConfigError('Bing API 키가 설정되지 않았습니다.', 'indexUrls', 'api_key', {
          hasApiKey: false,
        })
      }

      const results = []
      const failedUrls = []

      for (const url of urls) {
        const result = await this.indexSingleUrl(url, bingConfig)
        results.push(result)

        // 인덱싱 로그 저장
        await this.prisma.indexingLog.create({
          data: {
            siteUrl: 'global', // 전역 설정이므로 임시값
            targetUrl: url,
            provider: 'BING',
            status: result.success ? 'SUCCESS' : 'FAILED',
            message: result.success ? result.message : result.error,
            responseData: JSON.stringify(result),
          },
        })

        // 실패한 URL 추적
        if (!result.success) {
          failedUrls.push({
            url: result.url,
            error: result.error,
          })
        }
      }

      // 실패한 URL이 있으면 에러 throw
      if (failedUrls.length > 0) {
        throw new BingSubmissionError(
          `${failedUrls.length}/${urls.length} URL Bing 인덱싱 실패`,
          'indexUrls',
          undefined,
          'global',
          {
            failedUrls,
            totalCount: urls.length,
            failedCount: failedUrls.length,
            results,
          },
        )
      }

      this.logger.log(`Bing 인덱싱 완료: ${results.length}개 URL`)
      return { results }
    } catch (error) {
      this.logger.error('Bing 인덱싱 실패:', error)

      if (error instanceof BingConfigError || error instanceof BingAuthError || error instanceof BingSubmissionError) {
        throw error
      }

      throw new BingSubmissionError(`Bing 인덱싱 실패: ${error.message}`, 'indexUrls', undefined, 'global', {
        urlCount: urls.length,
      })
    }
  }

  private async indexSingleUrl(url: string, config: any): Promise<any> {
    try {
      // Bing Webmaster API 호출 로직
      this.logger.log(`Bing 인덱싱 요청: ${url}`)

      // 임시 응답 (실제로는 Bing API 호출)
      return {
        success: true,
        url,
        message: 'Bing 인덱싱 요청 성공',
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

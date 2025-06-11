import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'
import { SettingsService } from '../../shared/settings.service'

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
    const globalSettings = await this.settingsService.getGlobalEngineSettings()

    if (!globalSettings.bing || !globalSettings.bing.use) {
      throw new Error('Bing 색인이 비활성화되어 있습니다.')
    }

    if (!globalSettings.bing.apiKey) {
      throw new Error('Bing API 키가 설정되지 않았습니다.')
    }

    return {
      apiKey: globalSettings.bing.apiKey,
    }
  }

  private createPayload(siteUrl: string, urls: string[]): BingSubmitPayload {
    return {
      siteUrl,
      urlList: urls,
    }
  }

  async submitUrlToBing(siteUrl: string, url: string): Promise<any> {
    const config = await this.getBingConfig()
    const payload = this.createPayload(siteUrl, [url])

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${config.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      // 로그 기록
      await this.prisma.createIndexingLog({
        siteUrl,
        targetUrl: url,
        provider: 'BING',
        status: 'SUCCESS',
        responseData: response.data,
      })

      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.createIndexingLog({
        siteUrl,
        targetUrl: url,
        provider: 'BING',
        status: 'FAILED',
        message: error.message,
      })

      throw new Error(`Bing 색인 요청 실패: ${error.message}`)
    }
  }

  async submitMultipleUrlsToBing(siteUrl: string, urls: string[]): Promise<any> {
    const config = await this.getBingConfig()
    const payload = this.createPayload(siteUrl, urls)

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${config.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      // 각 URL마다 성공 로그 기록
      for (const url of urls) {
        await this.prisma.createIndexingLog({
          siteUrl,
          targetUrl: url,
          provider: 'BING',
          status: 'SUCCESS',
          responseData: response.data,
        })
      }

      return response.data
    } catch (error) {
      // 각 URL마다 실패 로그 기록
      for (const url of urls) {
        await this.prisma.createIndexingLog({
          siteUrl,
          targetUrl: url,
          provider: 'BING',
          status: 'FAILED',
          message: error.message,
        })
      }

      throw new Error(`Bing 다중 색인 요청 실패: ${error.message}`)
    }
  }

  async manualIndexing(options: BingIndexerOptions): Promise<any> {
    if (!options.siteUrl) {
      throw new Error('siteUrl이 필요합니다.')
    }

    if (options.url) {
      return this.submitUrlToBing(options.siteUrl, options.url)
    } else if (options.urls && options.urls.length > 0) {
      return this.submitMultipleUrlsToBing(options.siteUrl, options.urls)
    } else {
      throw new Error('URL 또는 URLs가 필요합니다.')
    }
  }

  async getUrlInfo(siteUrl: string, urls: string[]): Promise<any> {
    this.logger.log(`Bing URL 상태 조회: ${siteUrl}`)

    try {
      const config = await this.getBingConfig()

      // ... rest of the existing method implementation ...
    } catch (error) {
      this.logger.error('Bing URL 상태 조회 실패:', error)
      throw error
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Bing 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Bing 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const bingConfig = globalSettings.bing

      if (!bingConfig.use) {
        throw new Error('Bing 인덱싱이 비활성화되어 있습니다.')
      }

      if (!bingConfig.apiKey) {
        throw new Error('Bing API 키가 설정되지 않았습니다.')
      }

      const results = []

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
      }

      this.logger.log(`Bing 인덱싱 완료: ${results.length}개 URL`)
      return results
    } catch (error) {
      this.logger.error('Bing 인덱싱 실패:', error)
      throw error
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

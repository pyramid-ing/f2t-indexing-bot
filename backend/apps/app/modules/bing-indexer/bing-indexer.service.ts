import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

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

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private async getBingConfig(siteUrl: string) {
    const site = await this.prisma.getSiteWithConfigs(siteUrl)
    if (!site) {
      throw new Error(`사이트 설정을 찾을 수 없습니다: ${siteUrl}`)
    }

    if (!site.bingConfig || !site.bingConfig.use) {
      throw new Error(`Bing 인덱싱이 비활성화되었습니다: ${siteUrl}`)
    }

    if (!site.bingConfig.apiKey) {
      throw new Error(`Bing API 키가 설정되지 않았습니다: ${siteUrl}`)
    }

    return {
      apiKey: site.bingConfig.apiKey,
      siteUrl: site.siteUrl,
    }
  }

  private createPayload(siteUrl: string, urls: string[]): BingSubmitPayload {
    return {
      siteUrl,
      urlList: urls,
    }
  }

  async submitUrlToBing(siteUrl: string, url: string): Promise<any> {
    const config = await this.getBingConfig(siteUrl)
    const payload = this.createPayload(config.siteUrl, [url])

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
        siteUrl: config.siteUrl,
        targetUrl: url,
        provider: 'BING',
        status: 'SUCCESS',
        responseData: response.data,
      })

      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.createIndexingLog({
        siteUrl: config.siteUrl,
        targetUrl: url,
        provider: 'BING',
        status: 'FAILED',
        message: error.message,
      })

      throw new Error(`Bing 색인 요청 실패: ${error.message}`)
    }
  }

  async submitMultipleUrlsToBing(siteUrl: string, urls: string[]): Promise<any> {
    const config = await this.getBingConfig(siteUrl)
    const payload = this.createPayload(config.siteUrl, urls)

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
          siteUrl: config.siteUrl,
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
          siteUrl: config.siteUrl,
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
}

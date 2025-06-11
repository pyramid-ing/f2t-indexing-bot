import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

export interface BingIndexerOptions {
  url?: string
  urls?: string[]
}

interface BingSubmitPayload {
  siteUrl: string
  urlList: string[]
}

@Injectable()
export class BingIndexerService {
  private readonly apiKey = '06305dbe6ab34b0b9727f3c44dc0c802'
  private readonly siteUrl = 'https://pyramid-ing.com'
  private readonly bingApiUrl = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch'

  constructor(private readonly httpService: HttpService) {}

  private createPayload(urls: string[]): BingSubmitPayload {
    return {
      siteUrl: this.siteUrl,
      urlList: urls,
    }
  }

  async submitUrlToBing(url: string): Promise<any> {
    const payload = this.createPayload([url])

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${this.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`Bing 색인 요청 실패: ${error.message}`)
    }
  }

  async submitMultipleUrlsToBing(urls: string[]): Promise<any> {
    const payload = this.createPayload(urls)

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${this.apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`Bing 다중 색인 요청 실패: ${error.message}`)
    }
  }

  async manualIndexing(options: BingIndexerOptions): Promise<any> {
    if (options.url) {
      return this.submitUrlToBing(options.url)
    } else if (options.urls && options.urls.length > 0) {
      return this.submitMultipleUrlsToBing(options.urls)
    } else {
      throw new Error('URL 또는 URLs가 필요합니다.')
    }
  }
}

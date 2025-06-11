import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'

export interface GoogleIndexerOptions {
  url?: string
  urls?: string[]
  type?: 'URL_UPDATED' | 'URL_DELETED'
}

@Injectable()
export class GoogleIndexerService {
  private readonly googleIndexingUrl = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

  constructor(
    private readonly httpService: HttpService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async submitUrlToGoogle(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<any> {
    const payload = {
      url,
      type,
    }

    try {
      const headers = await this.googleAuthService.getAuthHeaders()

      const response = await firstValueFrom(this.httpService.post(this.googleIndexingUrl, payload, { headers }))

      return response.data
    } catch (error) {
      throw new Error(`Google 색인 요청 실패: ${error.message}`)
    }
  }

  async submitMultipleUrlsToGoogle(
    urls: string[],
    type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
  ): Promise<any[]> {
    const results = []

    try {
      for (const url of urls) {
        const result = await this.submitUrlToGoogle(url, type)
        results.push({ url, result })
      }

      return results
    } catch (error) {
      throw new Error(`Google 다중 색인 요청 실패: ${error.message}`)
    }
  }

  async manualIndexing(options: GoogleIndexerOptions): Promise<any> {
    const type = options.type || 'URL_UPDATED'

    if (options.url) {
      return this.submitUrlToGoogle(options.url, type)
    } else if (options.urls && options.urls.length > 0) {
      return this.submitMultipleUrlsToGoogle(options.urls, type)
    } else {
      throw new Error('URL 또는 URLs가 필요합니다.')
    }
  }
}

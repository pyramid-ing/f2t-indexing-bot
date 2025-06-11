import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

export interface GoogleIndexerOptions {
  url?: string
  urls?: string[]
  siteUrl: string // 필수로 변경: DB에서 설정을 찾기 위해 필요
  type?: 'URL_UPDATED' | 'URL_DELETED'
}

@Injectable()
export class GoogleIndexerService {
  private readonly googleIndexingUrl = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

  constructor(
    private readonly httpService: HttpService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
  ) {}

  private async getGoogleConfig(siteUrl: string) {
    const site = await this.prisma.getSiteWithConfigs(siteUrl)
    if (!site) {
      throw new Error(`사이트 설정을 찾을 수 없습니다: ${siteUrl}`)
    }

    if (!site.googleConfig || !site.googleConfig.use) {
      throw new Error(`Google 인덱싱이 비활성화되었습니다: ${siteUrl}`)
    }

    return {
      config: site.googleConfig,
      siteUrl: site.siteUrl,
    }
  }

  async submitUrlToGoogle(
    siteUrl: string,
    url: string,
    type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
  ): Promise<any> {
    const { config } = await this.getGoogleConfig(siteUrl)
    const payload = {
      url,
      type,
    }

    try {
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

      throw new Error(`Google 색인 요청 실패: ${error.message}`)
    }
  }

  async submitMultipleUrlsToGoogle(
    siteUrl: string,
    urls: string[],
    type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
  ): Promise<any[]> {
    await this.getGoogleConfig(siteUrl) // 설정 확인
    const results = []

    try {
      for (const url of urls) {
        const result = await this.submitUrlToGoogle(siteUrl, url, type)
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
      return this.submitUrlToGoogle(options.siteUrl, options.url, type)
    } else if (options.urls && options.urls.length > 0) {
      return this.submitMultipleUrlsToGoogle(options.siteUrl, options.urls, type)
    } else {
      throw new Error('URL 또는 URLs가 필요합니다.')
    }
  }
}

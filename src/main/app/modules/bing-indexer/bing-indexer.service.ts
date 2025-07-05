import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { BingAuthError, BingConfigError, BingSubmissionError } from '@main/filters/error.types'
import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import { BingIndexerOptions, BingSubmitPayload } from 'src/main/app/modules/bing-indexer/bing-indexer.types'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import axios from 'axios'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { JobService } from '@main/app/modules/job/job.service'
import { JobLogsService } from '@main/app/modules/job-logs/job-logs.service'

@Injectable()
export class BingIndexerService {
  private readonly bingApiUrl = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch'
  private readonly logger = new Logger(BingIndexerService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly siteConfigService: SiteConfigService,
    private readonly settingsService: SettingsService,
    private readonly jobService: JobService,
    private readonly jobLogsService: JobLogsService,
  ) {}

  private async getBingConfigForSite(siteId: number) {
    try {
      const siteConfig = await this.siteConfigService.getSiteConfig(siteId)

      if (!siteConfig.bingConfig || !siteConfig.bingConfig.use) {
        throw new BingConfigError('Bing 색인이 비활성화되어 있습니다.', 'getBingConfigForSite', 'indexing_service', {
          enabled: false,
          siteId,
        })
      }

      if (!siteConfig.bingConfig.apiKey) {
        throw new BingConfigError('Bing API 키가 설정되지 않았습니다.', 'getBingConfigForSite', 'api_key', {
          hasApiKey: false,
          siteId,
        })
      }

      return {
        apiKey: siteConfig.bingConfig.apiKey,
        siteConfig,
      }
    } catch (error) {
      if (error instanceof BingConfigError) {
        throw error
      }
      throw new BingConfigError(`Bing 설정 조회 실패: ${error.message}`, 'getBingConfigForSite', 'settings_fetch', {
        siteId,
      })
    }
  }

  private createPayload(siteUrl: string, urls: string[]): BingSubmitPayload {
    return {
      siteUrl,
      urlList: urls,
    }
  }

  async submitUrlToBing(siteId: number, url: string): Promise<any> {
    try {
      // 사이트 존재 여부 및 도메인 일치 검증
      await this.siteConfigService.validateSiteExists(siteId)
      await this.siteConfigService.validateUrlDomain(siteId, url)

      const { apiKey, siteConfig } = await this.getBingConfigForSite(siteId)
      const payload = this.createPayload(siteConfig.siteUrl, [url])

      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${apiKey}`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      // 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteId,
          targetUrl: url,
          provider: 'BING',
          status: 'SUCCESS',
          responseData: JSON.stringify(response.data),
        },
      })

      if (response.data && response.data.d && response.data.d.ErrorCode) {
        throw new BingSubmissionError(
          `Bing API 오류: ${response.data.d.Message}`,
          'submitUrlToBing',
          url,
          siteId.toString(),
          {
            errorCode: response.data.d.ErrorCode,
            errorMessage: response.data.d.Message,
            responseData: response.data,
          },
        )
      }

      // 성공 로그 기록
      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'BING',
        },
      })

      if (!job) {
        this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
        return response.data
      }

      await this.jobLogsService.create({
        jobId: job.jobId,
        message: `Bing 인덱싱 성공: ${url}`,
        level: 'info',
      })

      return response.data
    } catch (error) {
      // 실패 로그 기록
      await this.prisma.indexingLog.create({
        data: {
          siteId,
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
          siteId,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new BingSubmissionError(
          'Bing API 권한이 없습니다. 사이트 등록 및 API 키 권한을 확인해주세요.',
          'submitUrlToBing',
          url,
          siteId.toString(),
          { responseStatus: 403, responseData: error.response?.data },
        )
      } else if (error.response?.status === 429) {
        throw new BingSubmissionError(
          'Bing API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'submitUrlToBing',
          url,
          siteId.toString(),
          { responseStatus: 429, responseData: error.response?.data },
        )
      }

      // 실패 로그 기록
      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'BING',
        },
      })

      if (job) {
        await this.jobLogsService.create({
          jobId: job.jobId,
          message: `Bing 인덱싱 실패: ${error.message}`,
          level: 'error',
        })
      } else {
        this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
      }

      throw new BingSubmissionError(
        `Bing 색인 요청 실패: ${error.message}`,
        'submitUrlToBing',
        url,
        siteId.toString(),
        {
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          axiosCode: error.code,
        },
      )
    }
  }

  async submitMultipleUrlsToBing(siteId: number, urls: string[]): Promise<any> {
    try {
      // 사이트 존재 여부 검증
      await this.siteConfigService.validateSiteExists(siteId)

      // 각 URL에 대해 도메인 일치 검증
      for (const url of urls) {
        await this.siteConfigService.validateUrlDomain(siteId, url)
      }

      const { apiKey, siteConfig } = await this.getBingConfigForSite(siteId)
      const payload = this.createPayload(siteConfig.siteUrl, urls)

      const response = await firstValueFrom(
        this.httpService.post(`${this.bingApiUrl}?apikey=${apiKey}`, payload, {
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
          siteId.toString(),
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
            siteId,
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
            siteId,
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
          urls,
          siteId,
          responseStatus: 401,
        })
      } else if (error.response?.status === 403) {
        throw new BingSubmissionError(
          'Bing API 권한이 없습니다. 사이트 등록 및 API 키 권한을 확인해주세요.',
          'submitMultipleUrlsToBing',
          undefined,
          siteId.toString(),
          { responseStatus: 403, responseData: error.response?.data, urlCount: urls.length },
        )
      } else if (error.response?.status === 429) {
        throw new BingSubmissionError(
          'Bing API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          'submitMultipleUrlsToBing',
          undefined,
          siteId.toString(),
          { responseStatus: 429, responseData: error.response?.data, urlCount: urls.length },
        )
      }

      throw new BingSubmissionError(
        `Bing 다중 색인 요청 실패: ${error.message}`,
        'submitMultipleUrlsToBing',
        undefined,
        siteId.toString(),
        {
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          urlCount: urls.length,
          axiosCode: error.code,
        },
      )
    }
  }

  async manualIndexing(options: BingIndexerOptions): Promise<any> {
    const { url, urls, siteId } = options

    if (!siteId) {
      throw new BingSubmissionError('Site ID가 필요합니다.', 'manualIndexing', '', '0', { options })
    }

    // 단일 URL 처리
    if (url) {
      return await this.submitUrlToBing(siteId, url)
    }

    // 다중 URL 처리
    if (urls && urls.length > 0) {
      return await this.submitMultipleUrlsToBing(siteId, urls)
    }

    throw new BingSubmissionError('처리할 URL이 제공되지 않았습니다.', 'manualIndexing', '', siteId.toString(), {
      options,
    })
  }

  // 레거시 호환성을 위한 메서드 (필요한 경우)
  async indexUrls(urls: string[], siteId?: number): Promise<any> {
    if (!siteId) {
      throw new BingSubmissionError('Site ID가 필요합니다.', 'indexUrls', '', '0', { urls })
    }

    return await this.submitMultipleUrlsToBing(siteId, urls)
  }

  async submitUrl(siteId: number, url: string): Promise<{ success: boolean; message: string }> {
    try {
      const site = await this.prisma.site.findUnique({
        where: { id: siteId },
      })

      if (!site) {
        throw new Error('사이트를 찾을 수 없습니다.')
      }

      const settings = await this.settingsService.getAppStatus()
      const bingSettings = settings.bing

      if (!bingSettings?.apiKey) {
        throw new Error('Bing API Key가 설정되지 않았습니다.')
      }

      const response = await axios.post(
        'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl',
        {
          siteUrl: site.domain,
          url,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Bing-ApiKey': bingSettings.apiKey,
          },
        },
      )

      // 성공 로그
      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'bing',
        },
        include: {
          job: true,
        },
      })

      if (job?.job) {
        await this.jobLogsService.create({
          jobId: job.job.id,
          message: `Bing 인덱싱 요청 성공: ${url}`,
          level: 'info',
        })
      }

      return {
        success: true,
        message: '인덱싱 요청이 성공적으로 처리되었습니다.',
      }
    } catch (error) {
      // 실패 로그
      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'bing',
        },
        include: {
          job: true,
        },
      })

      if (job?.job) {
        await this.jobLogsService.create({
          jobId: job.job.id,
          message: `Bing 인덱싱 요청 실패: ${error.message}`,
          level: 'error',
        })
      }

      return {
        success: false,
        message: `인덱싱 요청 실패: ${error.message}`,
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../common/prisma/prisma.service'
import { IndexJobService } from '../index-job/index-job.service'
import * as xml2js from 'xml2js'
import axios from 'axios'

interface SitemapUrl {
  loc: string
  lastmod?: string
}

// 플랫폼별 사이트맵 처리기 인터페이스
interface SitemapProcessor {
  canProcess(sitemapType: string): boolean
  processSitemap(xmlText: string, baseUrl: string): Promise<SitemapUrl[]>
}

// 통합 사이트맵 처리기 (모든 플랫폼 지원)
class DefaultSitemapProcessor implements SitemapProcessor {
  canProcess(sitemapType: string): boolean {
    return ['blogspot', 'tistory', 'wordpress'].includes(sitemapType)
  }

  async processSitemap(xmlText: string, baseUrl: string): Promise<SitemapUrl[]> {
    const parser = new xml2js.Parser({ explicitArray: false })
    const data = await parser.parseStringPromise(xmlText)

    const urls: SitemapUrl[] = []
    const xmlUrls: string[] = [] // XML URL들을 별도로 수집

    if (data.urlset && data.urlset.url) {
      const urlArray = Array.isArray(data.urlset.url) ? data.urlset.url : [data.urlset.url]

      for (const url of urlArray) {
        // loc이 있는 URL만 처리
        if (url.loc && typeof url.loc === 'string') {
          // XML URL인지 확인 (확장자가 .xml이거나 sitemap이 포함된 경우)
          if (this.isXmlUrl(url.loc)) {
            xmlUrls.push(url.loc)
          } else {
            urls.push({
              loc: url.loc,
              lastmod: url.lastmod || undefined, // lastmod가 없어도 처리
            })
          }
        }
      }
    }

    // XML URL들을 재귀적으로 처리
    for (const xmlUrl of xmlUrls) {
      try {
        const response = await axios.get(xmlUrl)
        const nestedUrls = await this.processSitemap(response.data, xmlUrl)
        urls.push(...nestedUrls)
      } catch (error) {
        console.error(`XML URL 처리 실패: ${xmlUrl}`, error)
      }
    }

    return urls
  }

  /**
   * URL이 XML 사이트맵인지 확인
   */
  private isXmlUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase()
    return (
      lowerUrl.endsWith('.xml') ||
      lowerUrl.includes('sitemap') ||
      lowerUrl.includes('sitemap_index') ||
      lowerUrl.includes('sitemap-index')
    )
  }
}

@Injectable()
export class SitemapQueueProcessor {
  private readonly logger = new Logger(SitemapQueueProcessor.name)
  private readonly processors: SitemapProcessor[] = []

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexJobService: IndexJobService,
  ) {
    // 통합 처리기 등록
    this.processors = [new DefaultSitemapProcessor()]
  }

  /**
   * 1분마다 실행되는 cron 작업
   * 활성화된 사이트맵들을 파싱하고 새로운 URL들을 인덱싱 작업으로 생성
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async parseSitemaps() {
    this.logger.log('Sitemap 파싱 작업 시작')

    try {
      // 활성화된 사이트맵 설정들을 조회
      const sitemapConfigs = await this.prisma.sitemapConfig.findMany({
        where: {
          isEnabled: true,
        },
        include: {
          site: true,
        },
      })

      for (const config of sitemapConfigs) {
        await this.processSitemapConfig(config)
      }
    } catch (error) {
      this.logger.error('Sitemap 파싱 중 오류 발생:', error)
    }
  }

  /**
   * 특정 사이트맵 설정을 처리
   */
  async processSitemapConfig(config: any) {
    try {
      this.logger.log(`사이트맵 "${config.name}" (${config.sitemapType}) 처리 시작`)

      // sitemap URL 생성
      const sitemapUrl = this.generateSitemapUrl(config.site.siteUrl, config.sitemapType)

      // sitemap XML 가져오기 (axios 사용)
      const response = await axios.get(sitemapUrl)
      const xmlText = response.data

      // 플랫폼별 처리기 찾기
      const processor = this.processors.find(p => p.canProcess(config.sitemapType))
      if (!processor) {
        throw new Error(`지원하지 않는 사이트맵 타입: ${config.sitemapType}`)
      }

      // 플랫폼별 처리
      const urls = await processor.processSitemap(xmlText, sitemapUrl)

      // 새로운 URL들 찾기
      const newUrls = await this.findNewUrls(config.siteId, urls)

      // 새로운 URL들에 대해 인덱싱 작업 생성
      for (const url of newUrls) {
        await this.createIndexJobForUrl(config.site, url)
      }

      // 마지막 파싱 시간 업데이트
      await this.prisma.sitemapConfig.update({
        where: { id: config.id },
        data: { lastParsed: new Date() },
      })

      this.logger.log(`사이트맵 "${config.name}": ${newUrls.length}개의 새로운 URL 처리 완료`)
    } catch (error) {
      this.logger.error(`사이트맵 "${config.name}" 처리 중 오류:`, error)
    }
  }

  /**
   * 사이트맵 타입에 따라 URL 생성
   */
  private generateSitemapUrl(siteUrl: string, sitemapType: string): string {
    const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl

    switch (sitemapType) {
      case 'blogspot':
        return `${baseUrl}/sitemap.xml`
      case 'tistory':
        return `${baseUrl}/sitemap.xml`
      case 'wordpress':
        return `${baseUrl}/sitemap.xml`
      default:
        return `${baseUrl}/sitemap.xml`
    }
  }

  /**
   * 새로운 URL들 찾기 (중복되지 않은 것들)
   */
  private async findNewUrls(siteId: number, urls: SitemapUrl[]): Promise<SitemapUrl[]> {
    const newUrls: SitemapUrl[] = []

    for (const url of urls) {
      // 이미 처리된 URL인지 확인 (IndexJob 테이블에서 체크)
      const existingJob = await this.prisma.indexJob.findFirst({
        where: {
          siteId,
          url: url.loc,
        },
      })

      if (!existingJob) {
        newUrls.push(url)
      }
    }

    return newUrls
  }

  /**
   * URL에 대한 인덱싱 작업 생성
   */
  private async createIndexJobForUrl(site: any, url: SitemapUrl) {
    try {
      // 각 검색엔진에 대해 인덱싱 작업 생성
      const engines = ['GOOGLE', 'NAVER', 'DAUM', 'BING']

      for (const engine of engines) {
        const config = this.getEngineConfig(site, engine)
        if (config && config.use) {
          try {
            await this.indexJobService.create({
              url: url.loc,
              provider: engine,
              siteId: site.id,
            })
          } catch (error) {
            this.logger.error(`URL ${url.loc}의 ${engine} 인덱싱 작업 생성 실패:`, error)
          }
        }
      }
    } catch (error) {
      this.logger.error(`URL ${url.loc} 처리 중 오류:`, error)
    }
  }

  /**
   * 검색엔진별 설정 가져오기
   */
  private getEngineConfig(site: any, engine: string) {
    const configMap = {
      GOOGLE: site.googleConfig,
      NAVER: site.naverConfig,
      DAUM: site.daumConfig,
      BING: site.bingConfig,
    }

    const configStr = configMap[engine]
    if (!configStr) return null

    try {
      return JSON.parse(configStr)
    } catch {
      return null
    }
  }
}

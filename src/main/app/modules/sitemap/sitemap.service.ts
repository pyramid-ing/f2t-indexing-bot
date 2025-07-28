import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { SitemapQueueProcessor } from './sitemap-queue.processor'

@Injectable()
export class SitemapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sitemapQueueProcessor: SitemapQueueProcessor,
  ) {}

  /**
   * 사이트의 모든 사이트맵 설정 가져오기
   */
  async getSitemapConfigs(siteId: number) {
    return this.prisma.sitemapConfig.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 사이트맵 설정 생성
   */
  async createSitemapConfig(
    siteId: number,
    data: {
      name: string
      sitemapType: string
      isEnabled?: boolean
    },
  ) {
    return this.prisma.sitemapConfig.create({
      data: {
        ...data,
        siteId,
        isEnabled: data.isEnabled ?? true,
      },
    })
  }

  /**
   * 사이트맵 설정 업데이트
   */
  async updateSitemapConfig(
    id: string,
    data: {
      name?: string
      sitemapType?: string
      isEnabled?: boolean
    },
  ) {
    return this.prisma.sitemapConfig.update({
      where: { id },
      data,
    })
  }

  /**
   * 사이트맵 설정 삭제
   */
  async deleteSitemapConfig(id: string) {
    return this.prisma.sitemapConfig.delete({
      where: { id },
    })
  }

  /**
   * 사이트의 인덱싱 작업 목록 가져오기 (사이트맵에서 생성된 URL들)
   */
  async getIndexJobs(siteId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit

    const [jobs, total] = await Promise.all([
      this.prisma.indexJob.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          job: true,
        },
      }),
      this.prisma.indexJob.count({
        where: { siteId },
      }),
    ])

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * 수동으로 sitemap 파싱 실행
   */
  async parseSitemap(siteId: number) {
    try {
      // 해당 사이트의 모든 사이트맵 설정들을 조회 (활성/비활성 상관없이)
      const sitemapConfigs = await this.prisma.sitemapConfig.findMany({
        where: {
          siteId,
        },
        include: {
          site: true,
        },
      })

      if (sitemapConfigs.length === 0) {
        return { message: '사이트맵 설정이 없습니다.' }
      }

      // 각 사이트맵 설정에 대해 파싱 실행
      for (const config of sitemapConfigs) {
        await this.sitemapQueueProcessor.processSitemapConfig(config)
      }

      return { message: `${sitemapConfigs.length}개의 사이트맵 파싱이 완료되었습니다.` }
    } catch (error) {
      throw new Error(`사이트맵 파싱 중 오류가 발생했습니다: ${error.message}`)
    }
  }
}

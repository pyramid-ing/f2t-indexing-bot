import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

export interface SiteConfigData {
  siteUrl: string
  blogType: 'TISTORY' | 'BLOGGER' | 'WORDPRESS'
  indexingUrls: string[]
}

@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async createSiteConfig(data: SiteConfigData) {
    try {
      return await (this.prisma as any).site.create({
        data: {
          siteUrl: data.siteUrl,
          blogType: data.blogType,
          indexingUrls: JSON.stringify(data.indexingUrls),
        },
      })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('이미 존재하는 사이트 URL입니다.')
      }
      throw error
    }
  }

  async getSiteConfig(siteUrl: string) {
    const site = await (this.prisma as any).site.findUnique({
      where: { siteUrl },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    return {
      id: site.id,
      siteUrl: site.siteUrl,
      blogType: site.blogType,
      indexingUrls: JSON.parse(site.indexingUrls),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }
  }

  async updateSiteConfig(siteUrl: string, updates: Partial<SiteConfigData>) {
    const site = await (this.prisma as any).site.findUnique({
      where: { siteUrl },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    const updateData: any = {}

    if (updates.blogType) {
      updateData.blogType = updates.blogType
    }

    if (updates.indexingUrls) {
      updateData.indexingUrls = JSON.stringify(updates.indexingUrls)
    }

    return await (this.prisma as any).site.update({
      where: { siteUrl },
      data: updateData,
    })
  }

  async deleteSiteConfig(siteUrl: string) {
    const site = await (this.prisma as any).site.findUnique({
      where: { siteUrl },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    await (this.prisma as any).site.delete({
      where: { siteUrl },
    })

    return { message: '사이트 설정이 삭제되었습니다.' }
  }

  async getAllSiteConfigs() {
    const sites = await (this.prisma as any).site.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return sites.map((site: any) => ({
      id: site.id,
      siteUrl: site.siteUrl,
      blogType: site.blogType,
      indexingUrls: JSON.parse(site.indexingUrls),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }))
  }
}

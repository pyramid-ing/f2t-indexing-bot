import { PrismaService } from '@main/app/shared/prisma.service'
import { Injectable } from '@nestjs/common'

export interface SiteConfigData {
  domain: string
  name: string
  siteUrl: string
  isActive?: boolean
  googleConfig?: any
  naverConfig?: any
  daumConfig?: any
  bingConfig?: any
}

export interface EngineConfig {
  google?: any
  naver?: any
  daum?: any
  bing?: any
}

@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async createSiteConfig(data: SiteConfigData) {
    try {
      // 도메인 추출 (URL에서 도메인만 추출)
      const domain = this.extractDomain(data.siteUrl)

      return await (this.prisma as any).site.create({
        data: {
          domain,
          name: data.name,
          siteUrl: data.siteUrl,
          isActive: data.isActive ?? true,
          googleConfig: JSON.stringify(data.googleConfig || {}),
          naverConfig: JSON.stringify(data.naverConfig || {}),
          daumConfig: JSON.stringify(data.daumConfig || {}),
          bingConfig: JSON.stringify(data.bingConfig || {}),
        },
      })
    }
    catch (error) {
      if (error.code === 'P2002') {
        throw new Error('이미 존재하는 도메인입니다.')
      }
      throw error
    }
  }

  async getSiteConfig(siteId: number) {
    const site = await (this.prisma as any).site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    return {
      id: site.id,
      domain: site.domain,
      name: site.name,
      siteUrl: site.siteUrl,
      isActive: site.isActive,
      googleConfig: JSON.parse(site.googleConfig),
      naverConfig: JSON.parse(site.naverConfig),
      daumConfig: JSON.parse(site.daumConfig),
      bingConfig: JSON.parse(site.bingConfig),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }
  }

  async getSiteConfigByDomain(domain: string) {
    const site = await (this.prisma as any).site.findUnique({
      where: { domain },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    return {
      id: site.id,
      domain: site.domain,
      name: site.name,
      siteUrl: site.siteUrl,
      isActive: site.isActive,
      googleConfig: JSON.parse(site.googleConfig),
      naverConfig: JSON.parse(site.naverConfig),
      daumConfig: JSON.parse(site.daumConfig),
      bingConfig: JSON.parse(site.bingConfig),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }
  }

  async updateSiteConfig(siteId: number, updates: Partial<SiteConfigData>) {
    const site = await (this.prisma as any).site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    const updateData: any = {}

    if (updates.name)
      updateData.name = updates.name
    if (updates.siteUrl) {
      updateData.siteUrl = updates.siteUrl
      updateData.domain = this.extractDomain(updates.siteUrl)
    }
    if (updates.isActive !== undefined)
      updateData.isActive = updates.isActive
    if (updates.googleConfig)
      updateData.googleConfig = JSON.stringify(updates.googleConfig)
    if (updates.naverConfig)
      updateData.naverConfig = JSON.stringify(updates.naverConfig)
    if (updates.daumConfig)
      updateData.daumConfig = JSON.stringify(updates.daumConfig)
    if (updates.bingConfig)
      updateData.bingConfig = JSON.stringify(updates.bingConfig)

    return await (this.prisma as any).site.update({
      where: { id: siteId },
      data: updateData,
    })
  }

  async updateSiteEngineConfigs(siteId: number, configs: EngineConfig) {
    const site = await (this.prisma as any).site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    const updateData: any = {}

    if (configs.google)
      updateData.googleConfig = JSON.stringify(configs.google)
    if (configs.naver)
      updateData.naverConfig = JSON.stringify(configs.naver)
    if (configs.daum)
      updateData.daumConfig = JSON.stringify(configs.daum)
    if (configs.bing)
      updateData.bingConfig = JSON.stringify(configs.bing)

    return await (this.prisma as any).site.update({
      where: { id: siteId },
      data: updateData,
    })
  }

  async deleteSiteConfig(siteId: number) {
    const site = await (this.prisma as any).site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    await (this.prisma as any).site.delete({
      where: { id: siteId },
    })

    return { message: '사이트 설정이 삭제되었습니다.' }
  }

  async getAllSiteConfigs() {
    const sites = await (this.prisma as any).site.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return sites.map((site: any) => ({
      id: site.id,
      domain: site.domain,
      name: site.name,
      siteUrl: site.siteUrl,
      isActive: site.isActive,
      googleConfig: JSON.parse(site.googleConfig),
      naverConfig: JSON.parse(site.naverConfig),
      daumConfig: JSON.parse(site.daumConfig),
      bingConfig: JSON.parse(site.bingConfig),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }))
  }

  async getActiveSites() {
    const sites = await (this.prisma as any).site.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return sites.map((site: any) => ({
      id: site.id,
      domain: site.domain,
      name: site.name,
      siteUrl: site.siteUrl,
      isActive: site.isActive,
      googleConfig: JSON.parse(site.googleConfig),
      naverConfig: JSON.parse(site.naverConfig),
      daumConfig: JSON.parse(site.daumConfig),
      bingConfig: JSON.parse(site.bingConfig),
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }))
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    }
    catch {
      // URL이 아닌 경우 그대로 반환
      return url.replace('www.', '')
    }
  }
}

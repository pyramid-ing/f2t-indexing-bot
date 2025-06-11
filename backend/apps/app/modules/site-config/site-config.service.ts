import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

export interface SiteConfigData {
  siteUrl: string
  blogType: 'TISTORY' | 'BLOGGER' | 'WORDPRESS'
  indexingUrls: string[]
  bing?: {
    use: boolean
    apiKey?: string
  }
  google?: {
    use: boolean
    serviceAccountEmail?: string
    privateKey?: string
    oauth2ClientId?: string
    oauth2ClientSecret?: string
    oauth2AccessToken?: string
    oauth2RefreshToken?: string
    oauth2TokenExpiry?: Date
  }
  daum?: {
    use: boolean
    siteUrl?: string
    password?: string
  }
  naver?: {
    use: boolean
    naverId?: string
    password?: string
  }
}

@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async createSiteConfig(data: SiteConfigData) {
    try {
      return await this.prisma.createSiteWithConfigs(data)
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('이미 존재하는 사이트 URL입니다.')
      }
      throw error
    }
  }

  async getSiteConfig(siteUrl: string) {
    const site = await this.prisma.getSiteWithConfigs(siteUrl)
    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    return {
      id: site.id,
      siteUrl: site.siteUrl,
      blogType: site.blogType,
      indexingUrls: JSON.parse(site.indexingUrls),
      bing: site.bingConfig
        ? {
            use: site.bingConfig.use,
            apiKey: site.bingConfig.apiKey,
          }
        : null,
      google: site.googleConfig
        ? {
            use: site.googleConfig.use,
            serviceAccountEmail: site.googleConfig.serviceAccountEmail,
            privateKey: site.googleConfig.privateKey,
            oauth2ClientId: site.googleConfig.oauth2ClientId,
            oauth2ClientSecret: site.googleConfig.oauth2ClientSecret,
            oauth2AccessToken: site.googleConfig.oauth2AccessToken,
            oauth2RefreshToken: site.googleConfig.oauth2RefreshToken,
            oauth2TokenExpiry: site.googleConfig.oauth2TokenExpiry,
          }
        : null,
      daum: site.daumConfig
        ? {
            use: site.daumConfig.use,
            siteUrl: site.daumConfig.siteUrl,
            password: site.daumConfig.password,
          }
        : null,
      naver: site.naverConfig
        ? {
            use: site.naverConfig.use,
            naverId: site.naverConfig.naverId,
            password: site.naverConfig.password,
          }
        : null,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }
  }

  async updateSiteConfig(siteUrl: string, updates: Partial<SiteConfigData>) {
    return await this.prisma.updateSiteConfigs(siteUrl, updates)
  }

  async deleteSiteConfig(siteUrl: string) {
    const site = await this.prisma.getSiteWithConfigs(siteUrl)
    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    await (this.prisma as any).site.delete({
      where: { id: site.id },
    })

    return { message: '사이트 설정이 삭제되었습니다.' }
  }

  async getAllSiteConfigs() {
    const sites = await (this.prisma as any).site.findMany({
      include: {
        bingConfig: true,
        googleConfig: true,
        daumConfig: true,
        naverConfig: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return sites.map((site: any) => ({
      id: site.id,
      siteUrl: site.siteUrl,
      blogType: site.blogType,
      indexingUrls: JSON.parse(site.indexingUrls),
      bing: site.bingConfig
        ? {
            use: site.bingConfig.use,
            apiKey: site.bingConfig.apiKey ? '****' : null, // 보안을 위해 마스킹
          }
        : null,
      google: site.googleConfig
        ? {
            use: site.googleConfig.use,
            serviceAccountEmail: site.googleConfig.serviceAccountEmail,
            oauth2ClientId: site.googleConfig.oauth2ClientId,
            // 민감한 정보는 마스킹
            privateKey: site.googleConfig.privateKey ? '****' : null,
            oauth2ClientSecret: site.googleConfig.oauth2ClientSecret ? '****' : null,
            oauth2AccessToken: site.googleConfig.oauth2AccessToken ? '****' : null,
            oauth2RefreshToken: site.googleConfig.oauth2RefreshToken ? '****' : null,
            oauth2TokenExpiry: site.googleConfig.oauth2TokenExpiry,
          }
        : null,
      daum: site.daumConfig
        ? {
            use: site.daumConfig.use,
            siteUrl: site.daumConfig.siteUrl,
            password: site.daumConfig.password ? '****' : null,
          }
        : null,
      naver: site.naverConfig
        ? {
            use: site.naverConfig.use,
            naverId: site.naverConfig.naverId,
            password: site.naverConfig.password ? '****' : null,
          }
        : null,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    }))
  }

  // 특정 서비스별 설정 업데이트 메서드들
  async updateBingConfig(siteUrl: string, config: { use: boolean; apiKey?: string }) {
    return await this.prisma.updateSiteConfigs(siteUrl, { bing: config })
  }

  async updateGoogleConfig(
    siteUrl: string,
    config: {
      use: boolean
      serviceAccountEmail?: string
      privateKey?: string
      oauth2ClientId?: string
      oauth2ClientSecret?: string
      oauth2AccessToken?: string
      oauth2RefreshToken?: string
      oauth2TokenExpiry?: Date
    },
  ) {
    return await this.prisma.updateSiteConfigs(siteUrl, { google: config })
  }

  async updateDaumConfig(siteUrl: string, config: { use: boolean; siteUrl?: string; password?: string }) {
    return await this.prisma.updateSiteConfigs(siteUrl, { daum: config })
  }

  async updateNaverConfig(siteUrl: string, config: { use: boolean; naverId?: string; password?: string }) {
    return await this.prisma.updateSiteConfigs(siteUrl, { naver: config })
  }
}

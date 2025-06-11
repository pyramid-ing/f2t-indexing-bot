import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  // 사이트 설정 관련 헬퍼 메서드들
  async getSiteWithConfigs(siteUrl: string) {
    return (this as any).site.findUnique({
      where: { siteUrl },
      include: {
        bingConfig: true,
        googleConfig: true,
        daumConfig: true,
        naverConfig: true,
      },
    })
  }

  async createSiteWithConfigs(data: {
    siteUrl: string
    blogType: 'TISTORY' | 'BLOGGER' | 'WORDPRESS'
    indexingUrls: string[]
    bing?: { use: boolean; apiKey?: string }
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
    daum?: { use: boolean; siteUrl?: string; password?: string }
    naver?: { use: boolean; naverId?: string; password?: string }
  }) {
    return this.$transaction(async (tx: any) => {
      // 사이트 생성
      const site = await tx.site.create({
        data: {
          siteUrl: data.siteUrl,
          blogType: data.blogType,
          indexingUrls: JSON.stringify(data.indexingUrls),
        },
      })

      // Bing 설정 생성
      if (data.bing) {
        await tx.bingConfig.create({
          data: {
            siteId: site.id,
            use: data.bing.use,
            apiKey: data.bing.apiKey,
          },
        })
      }

      // Google 설정 생성
      if (data.google) {
        await tx.googleConfig.create({
          data: {
            siteId: site.id,
            use: data.google.use,
            serviceAccountEmail: data.google.serviceAccountEmail,
            privateKey: data.google.privateKey,
            oauth2ClientId: data.google.oauth2ClientId,
            oauth2ClientSecret: data.google.oauth2ClientSecret,
            oauth2AccessToken: data.google.oauth2AccessToken,
            oauth2RefreshToken: data.google.oauth2RefreshToken,
            oauth2TokenExpiry: data.google.oauth2TokenExpiry,
          },
        })
      }

      // Daum 설정 생성
      if (data.daum) {
        await tx.daumConfig.create({
          data: {
            siteId: site.id,
            use: data.daum.use,
            siteUrl: data.daum.siteUrl,
            password: data.daum.password,
          },
        })
      }

      // Naver 설정 생성
      if (data.naver) {
        await tx.naverConfig.create({
          data: {
            siteId: site.id,
            use: data.naver.use,
            naverId: data.naver.naverId,
            password: data.naver.password,
          },
        })
      }

      return this.getSiteWithConfigs(site.siteUrl)
    })
  }

  async updateSiteConfigs(siteUrl: string, updates: any) {
    return this.$transaction(async (tx: any) => {
      const site = await tx.site.findUnique({ where: { siteUrl } })
      if (!site) throw new Error('Site not found')

      // 사이트 정보 업데이트
      if (updates.blogType || updates.indexingUrls) {
        await tx.site.update({
          where: { id: site.id },
          data: {
            ...(updates.blogType && { blogType: updates.blogType }),
            ...(updates.indexingUrls && { indexingUrls: JSON.stringify(updates.indexingUrls) }),
          },
        })
      }

      // 각 서비스별 설정 업데이트
      if (updates.bing) {
        await tx.bingConfig.upsert({
          where: { siteId: site.id },
          create: { siteId: site.id, ...updates.bing },
          update: updates.bing,
        })
      }

      if (updates.google) {
        await tx.googleConfig.upsert({
          where: { siteId: site.id },
          create: { siteId: site.id, ...updates.google },
          update: updates.google,
        })
      }

      if (updates.daum) {
        await tx.daumConfig.upsert({
          where: { siteId: site.id },
          create: { siteId: site.id, ...updates.daum },
          update: updates.daum,
        })
      }

      if (updates.naver) {
        await tx.naverConfig.upsert({
          where: { siteId: site.id },
          create: { siteId: site.id, ...updates.naver },
          update: updates.naver,
        })
      }

      return this.getSiteWithConfigs(siteUrl)
    })
  }

  // 색인 로그 관련 메서드들
  async createIndexingLog(data: {
    siteUrl: string
    targetUrl: string
    provider: 'BING' | 'GOOGLE' | 'DAUM' | 'NAVER'
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY'
    message?: string
    responseData?: any
  }) {
    return (this as any).indexingLog.create({
      data: {
        ...data,
        responseData: data.responseData ? JSON.stringify(data.responseData) : null,
      },
    })
  }

  async updateIndexingLog(
    id: number,
    updates: {
      status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY'
      message?: string
      responseData?: any
      completedAt?: Date
    },
  ) {
    return (this as any).indexingLog.update({
      where: { id },
      data: {
        ...updates,
        responseData: updates.responseData ? JSON.stringify(updates.responseData) : undefined,
      },
    })
  }

  async getIndexingLogs(siteUrl?: string, provider?: string, limit = 100) {
    return (this as any).indexingLog.findMany({
      where: {
        ...(siteUrl && { siteUrl }),
        ...(provider && { provider: provider as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}

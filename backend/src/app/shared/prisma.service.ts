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

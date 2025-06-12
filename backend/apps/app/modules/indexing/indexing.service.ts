import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma.service'
import { IndexProvider } from '@prisma/client'

@Injectable()
export class IndexingService {
  constructor(private readonly prisma: PrismaService) {}

  async getExistingUrls(urls: string[], providers: IndexProvider[]): Promise<Record<IndexProvider, string[]>> {
    const existingLogs = await this.prisma.indexingLog.findMany({
      where: {
        targetUrl: { in: urls },
        provider: { in: providers },
        status: 'SUCCESS',
      },
      select: {
        targetUrl: true,
        provider: true,
      },
    })

    const existingUrlsByProvider = providers.reduce(
      (acc, provider) => {
        acc[provider] = []
        return acc
      },
      {} as Record<IndexProvider, string[]>,
    )

    for (const log of existingLogs) {
      if (existingUrlsByProvider[log.provider]) {
        existingUrlsByProvider[log.provider].push(log.targetUrl)
      }
    }

    return existingUrlsByProvider
  }
}

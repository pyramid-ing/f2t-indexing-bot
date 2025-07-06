import { Injectable } from '@nestjs/common'
import { JobProcessor, JobResult, Job } from '../job/job.processor.interface'
import { BingIndexerService } from '../bing-indexer/bing-indexer.service'
import { GoogleIndexerService } from '../google/indexer/google-indexer.service'
import { NaverIndexerService } from '../naver-indexer/naver-indexer.service'
import { DaumIndexerService } from '../daum-indexer/daum-indexer.service'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { JobType } from '../job/job.types'
import { CreateIndexJobDto } from './index-job.types'
import { JobStatus } from '../job/job.types'

interface SubmitUrlResult {
  success: boolean
  message: string
  resultUrl?: string
}

@Injectable()
export class IndexJobService implements JobProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bingIndexer: BingIndexerService,
    private readonly googleIndexer: GoogleIndexerService,
    private readonly naverIndexer: NaverIndexerService,
    private readonly daumIndexer: DaumIndexerService,
  ) {}

  canProcess(job: Job): boolean {
    return job.type === JobType.INDEX
  }

  async process(job: Job): Promise<JobResult> {
    const indexJob = await this.prisma.indexJob.findUnique({
      where: { jobId: job.id },
      include: {
        site: true,
      },
    })

    if (!indexJob) {
      throw new Error('인덱스 작업 정보를 찾을 수 없습니다.')
    }

    const { provider, url, site } = indexJob

    let result: { success: boolean; message: string }

    try {
      switch (provider.toUpperCase()) {
        case 'GOOGLE':
          result = await this.googleIndexer.submitUrl(site.id, url)
          break
        case 'BING':
          result = await this.bingIndexer.submitUrl(site.id, url)
          break
        case 'NAVER':
          result = await this.naverIndexer.submitUrl(site.id, url)
          break
        case 'DAUM':
          result = await this.daumIndexer.submitUrl(site.id, url)
          break
        default:
          throw new Error(`지원하지 않는 인덱서: ${provider}`)
      }

      // 작업 로그 기록
      await this.prisma.jobLog.create({
        data: {
          jobId: job.id,
          message: `${provider} 인덱싱 요청 완료: ${result.message}`,
          level: result.success ? 'info' : 'error',
        },
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      return {
        message: result.message,
      }
    } catch (error) {
      // 에러 로그 기록
      await this.prisma.jobLog.create({
        data: {
          jobId: job.id,
          message: `${provider} 인덱싱 요청 실패: ${error.message}`,
          level: 'error',
        },
      })
      throw error
    }
  }

  async create(data: CreateIndexJobDto): Promise<SubmitUrlResult> {
    const { siteId, url, scheduledAt = new Date(), priority = 1 } = data

    // 사이트 확인
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    // 활성화된 검색엔진 확인
    const activeEngines = []
    const googleConfig = JSON.parse(site.googleConfig)
    const bingConfig = JSON.parse(site.bingConfig)
    const naverConfig = JSON.parse(site.naverConfig)
    const daumConfig = JSON.parse(site.daumConfig)

    if (googleConfig?.use) activeEngines.push('GOOGLE')
    if (bingConfig?.use) activeEngines.push('BING')
    if (naverConfig?.use) activeEngines.push('NAVER')
    if (daumConfig?.use) activeEngines.push('DAUM')

    if (activeEngines.length === 0) {
      throw new Error('활성화된 검색엔진이 없습니다.')
    }

    // 각 검색엔진에 대해 작업 생성
    const jobs = await Promise.all(
      activeEngines.map(async provider => {
        const job = await this.prisma.job.create({
          data: {
            type: JobType.INDEX,
            status: JobStatus.PENDING,
            data: JSON.stringify({
              url,
              provider,
              siteId,
            }),
            indexJob: {
              create: {
                siteId,
                provider,
                url,
              },
            },
          },
          include: {
            logs: true,
            indexJob: true,
          },
        })

        // 작업 생성 로그
        await this.prisma.jobLog.create({
          data: {
            jobId: job.id,
            message: `인덱싱 작업 생성됨: ${provider} - ${url}`,
            level: 'info',
          },
        })

        return job
      }),
    )

    return {
      success: true,
      message: `${activeEngines.length}개의 검색엔진에 대한 인덱싱 작업이 생성되었습니다.`,
      resultUrl: url,
    }
  }

  async findByJobId(jobId: string) {
    return this.prisma.indexJob.findUnique({
      where: { jobId },
      include: {
        site: true,
      },
    })
  }

  async findBySiteId(siteId: number) {
    return this.prisma.indexJob.findMany({
      where: { siteId },
      include: {
        job: true,
      },
    })
  }

  async findByUrl(url: string) {
    return this.prisma.indexJob.findMany({
      where: { url },
      include: {
        job: true,
        site: true,
      },
    })
  }

  async getAll() {
    return this.prisma.job.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async getById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
    })
  }

  async retry(id: string) {
    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'PENDING',
        startedAt: null,
        completedAt: null,
        errorMsg: null,
        resultMsg: null,
      },
    })
  }

  async delete(id: string) {
    return this.prisma.job.delete({
      where: { id },
    })
  }
}

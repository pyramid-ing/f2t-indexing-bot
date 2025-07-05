import { Injectable } from '@nestjs/common'
import { JobProcessor, JobResult, Job } from '../job/job.processor.interface'
import { BingIndexerService } from '../bing-indexer/bing-indexer.service'
import { GoogleIndexerService } from '../google/indexer/google-indexer.service'
import { NaverIndexerService } from '../naver-indexer/naver-indexer.service'
import { DaumIndexerService } from '../daum-indexer/daum-indexer.service'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { JobType } from '../job/job.types'
import { CreateIndexJobDto } from './index-job.types'
import { JobService } from '../job/job.service'

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
    private readonly jobService: JobService,
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
    const { siteId, provider, url, scheduledAt = new Date(), priority = 1 } = data

    // 사이트 확인
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new Error('사이트를 찾을 수 없습니다.')
    }

    // Job 생성
    const job = await this.jobService.create({
      type: JobType.INDEX,
      data: {
        url,
        provider,
        siteId,
      },
    })

    // IndexJob 생성
    await this.prisma.indexJob.create({
      data: {
        jobId: job.id,
        siteId,
        provider,
        url,
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

    return {
      success: true,
      message: '인덱싱 작업이 생성되었습니다.',
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
}

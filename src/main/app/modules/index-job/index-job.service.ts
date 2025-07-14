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
import { CustomHttpException } from '@main/common/errors/custom-http.exception'
import { ErrorCode } from '@main/common/errors/error-code.enum'

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

  // URL 정규화 함수 (클래스 메서드로 이동)
  static normalizeUrl(rawUrl: string): string {
    try {
      const urlObj = new URL(rawUrl)
      // www. 유지, 프로토콜 유지, 마지막 슬래시만 제거
      let protocol = urlObj.protocol.replace(/:$/, '') // 'https:' -> 'https'
      let host = urlObj.host // www. 포함 host 그대로
      let pathname = urlObj.pathname.replace(/\/$/, '') // 끝 슬래시만 제거
      // pathname이 빈 문자열이면 '/'로 대체 (루트 경로 보존)
      if (pathname === '') pathname = '/'
      return `${protocol}://${host}${pathname}${urlObj.search}`
    } catch {
      return rawUrl.trim()
    }
  }

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
      throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: '인덱스 작업 정보를 찾을 수 없습니다.' })
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
          throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: `지원하지 않는 인덱서: ${provider}` })
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
        throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: result.message })
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
    const { siteId, url, scheduledAt, priority } = data
    // subject, desc, scheduledAt 기본값 처리
    const finalSubject = (data as any).subject ?? `인덱싱 요청: ${url}`
    const finalDesc = (data as any).desc ?? '자동 생성된 인덱싱 작업'
    const finalScheduledAt = scheduledAt ?? new Date()

    // 사이트 확인
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    })

    if (!site) {
      throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: '사이트를 찾을 수 없습니다.' })
    }

    // URL이 해당 사이트 도메인에 속하는지 검사
    try {
      const urlObj = new URL(url)
      const inputDomain = urlObj.hostname.replace(/^www\./, '')
      const siteDomain = site.domain.replace(/^www\./, '')
      if (inputDomain !== siteDomain) {
        throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, {
          errorMessage: `입력한 URL의 도메인(${inputDomain})이 사이트 도메인(${siteDomain})과 일치하지 않습니다.`,
        })
      }
    } catch (e) {
      throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: '유효하지 않은 URL입니다.' })
    }

    // 정규화된 URL로 중복 체크 및 저장 (provider별로 체크)
    const normalizedUrl = IndexJobService.normalizeUrl(url)
    // provider가 여러 개일 수 있으므로, activeEngines 루프 안에서 각각 체크
    // 아래 코드를 기존 jobs = await Promise.all(...) 위로 이동

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
      throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, { errorMessage: '활성화된 검색엔진이 없습니다.' })
    }

    // 각 검색엔진에 대해 작업 생성
    const jobs = await Promise.all(
      activeEngines.map(async provider => {
        // provider별 중복 체크
        const existing = await this.prisma.indexJob.findFirst({
          where: {
            siteId,
            url: normalizedUrl,
            provider,
          },
        })
        if (existing) {
          // 이미 해당 provider로 인덱싱 요청된 경우는 건너뜀(혹은 에러 대신 무시)
          return null
        }
        const job = await this.prisma.job.create({
          data: {
            type: JobType.INDEX,
            status: JobStatus.PENDING,
            subject: finalSubject,
            desc: finalDesc,
            scheduledAt: finalScheduledAt,
            priority: priority ?? 1,
            IndexJob: {
              create: {
                siteId,
                provider,
                url: normalizedUrl,
              },
            },
          },
          include: {
            logs: true,
            IndexJob: true,
          },
        })
        // 작업 생성 로그
        await this.prisma.jobLog.create({
          data: {
            jobId: job.id,
            message: `인덱싱 작업 생성됨: ${provider} - ${normalizedUrl}`,
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
        errorMessage: null,
        resultMsg: null,
      },
    })
  }

  async delete(id: string) {
    return this.prisma.job.delete({
      where: { id },
    })
  }

  // 여러 URL 중 이미 인덱싱된 URL 목록 반환
  async findExistingUrls(siteId: number, urls: string[]): Promise<string[]> {
    const normalizedUrls = urls.map(IndexJobService.normalizeUrl)
    const found = await this.prisma.indexJob.findMany({
      where: {
        siteId,
        url: { in: normalizedUrls },
      },
      select: { url: true },
    })
    return found.map(f => f.url)
  }
}

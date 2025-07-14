import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { Cron, CronExpression } from '@nestjs/schedule'
import { JobStatus, JobType } from './job.types'
import { JobService } from './job.service'
import { JobLogsService } from '../job-logs/job-logs.service'
import { IndexJobService } from '../index-job/index-job.service'
import { CustomHttpException } from '@main/common/errors/custom-http.exception'
import { ErrorCode } from '@main/common/errors/error-code.enum'

@Injectable()
export class JobQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(JobQueueProcessor.name)
  private processors: Partial<Record<JobType, any>> = {}
  private isProcessing = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobService: JobService,
    private readonly jobLogsService: JobLogsService,
    private readonly indexJobService: IndexJobService,
  ) {}

  async onModuleInit() {
    this.processors = {
      [JobType.INDEX]: this.indexJobService,
    }
    // 1. 시작 직후 processing 상태인 것들을 error 처리 (중간에 강제종료된 경우)
    await this.prisma.job.updateMany({
      where: {
        status: JobStatus.PROCESSING,
      },
      data: {
        status: JobStatus.FAILED,
        errorMessage: '시스템 재시작으로 인해 작업이 중단되었습니다.',
      },
    })
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processNextJob() {
    if (this.isProcessing) {
      return
    }

    try {
      this.isProcessing = true
      const job = await this.jobService.findNextPendingJob()

      if (!job) {
        return
      }

      await this.processJob(job)
    } catch (error) {
      this.logger.error(`작업 처리 중 오류 발생: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(job: any) {
    try {
      await this.jobService.update(job.id, {
        status: JobStatus.PROCESSING,
      })
      await this.jobLogsService.create({
        jobId: job.id,
        message: '작업 처리를 시작합니다.',
        level: 'info',
      })
      const processor = this.processors[job.type]
      if (!processor) {
        throw new CustomHttpException(ErrorCode.INTERNAL_ERROR, {
          errorMessage: `지원하지 않는 작업 타입: ${job.type}`,
        })
      }
      const result = await processor.process(job)
      await this.jobService.update(job.id, {
        status: JobStatus.COMPLETED,
        resultMsg: result.message,
      })
      await this.jobLogsService.create({
        jobId: job.id,
        message: `작업이 완료되었습니다: ${result.message}`,
        level: 'info',
      })
    } catch (error) {
      await this.jobService.update(job.id, {
        status: JobStatus.FAILED,
        errorMessage: error.message,
      })
      await this.jobLogsService.create({
        jobId: job.id,
        message: `작업 처리 중 오류 발생: ${error.message}`,
        level: 'error',
      })
      this.logger.error(`작업 ${job.id} 처리 중 오류 발생: ${error.message}`)
    }
  }
}

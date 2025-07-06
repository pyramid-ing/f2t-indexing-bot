import { Controller, Get, Post, Delete, Param, Query, Body, Put } from '@nestjs/common'
import { JobService } from './job.service'
import { JobLogsService } from '../job-logs/job-logs.service'
import { JobStatus, UpdateJobDto } from './job.types'

@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly jobLogsService: JobLogsService,
  ) {}

  @Get()
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const where: any = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { desc: { contains: search } },
        { resultMsg: { contains: search } },
      ]
    }

    return this.jobService.findAll({
      where,
      orderBy: orderBy ? { [orderBy]: order || 'desc' } : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobService.findOne(id)
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string) {
    return this.jobLogsService.findByJobId(id)
  }

  @Get(':id/logs/latest')
  async getLatestLog(@Param('id') id: string) {
    return this.jobLogsService.findLatestByJobId(id)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateJobDto) {
    return this.jobService.update(id, data)
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string) {
    const job = await this.jobService.findOne(id)
    if (!job) {
      throw new Error('Job not found')
    }

    // 실패한 작업만 재시도 가능
    if (job.status !== JobStatus.FAILED) {
      throw new Error('Only failed jobs can be retried')
    }

    // 작업 상태를 대기 중으로 변경
    return this.jobService.update(id, {
      status: JobStatus.PENDING,
      resultMsg: '재시도 요청됨',
    })
  }

  @Post('retry')
  async retryMany(@Body() data: { ids: string[] }) {
    const { ids } = data
    const jobs = await this.jobService.findAll({
      where: {
        id: {
          in: ids,
        },
        status: JobStatus.FAILED,
      },
    })

    const results = await Promise.all(
      jobs.map(job =>
        this.jobService.update(job.id, {
          status: JobStatus.PENDING,
          resultMsg: '재시도 요청됨',
        }),
      ),
    )

    return {
      success: true,
      message: `${results.length}개의 작업이 재시도 요청되었습니다.`,
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const job = await this.jobService.findOne(id)
    if (!job) {
      throw new Error('Job not found')
    }

    // 처리 중인 작업은 삭제 불가
    if (job.status === JobStatus.PROCESSING) {
      throw new Error('Cannot delete a job in processing state')
    }

    await this.jobService.delete(id)
    return {
      success: true,
      message: '작업이 삭제되었습니다.',
    }
  }

  @Delete()
  async deleteMany(@Body() data: { ids: string[] }) {
    const { ids } = data
    const jobs = await this.jobService.findAll({
      where: {
        id: {
          in: ids,
        },
        status: {
          not: JobStatus.PROCESSING,
        },
      },
    })

    if (jobs.length === 0) {
      return {
        success: true,
        message: '삭제할 작업이 없습니다.',
      }
    }

    await this.jobService.deleteMany(jobs.map(job => job.id))
    return {
      success: true,
      message: `${jobs.length}개의 작업이 삭제되었습니다.`,
    }
  }
}

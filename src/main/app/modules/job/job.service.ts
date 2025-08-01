import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { UpdateJobDto, JobStatus } from './job.types'
import { Prisma } from '@prisma/client'

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name)

  constructor(private readonly prisma: PrismaService) {}

  async update(id: string, dto: UpdateJobDto) {
    try {
      const updateData: Prisma.JobUpdateInput = {}

      if (dto.status) {
        updateData.status = dto.status
      }

      if (dto.resultMsg) {
        updateData.resultMsg = dto.resultMsg
      }

      if (dto.errorMessage) {
        updateData.errorMessage = dto.errorMessage
      }

      return await this.prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          logs: true,
          IndexJob: true,
        },
      })
    } catch (error) {
      this.logger.error(`작업 업데이트 실패 (ID: ${id}):`, error)
      throw error
    }
  }

  async findOne(id: string) {
    try {
      return await this.prisma.job.findUnique({
        where: { id },
        include: {
          logs: true,
          IndexJob: true,
        },
      })
    } catch (error) {
      this.logger.error(`작업 조회 실패 (ID: ${id}):`, error)
      throw error
    }
  }

  async findAll(options: {
    where?: Prisma.JobWhereInput
    orderBy?: Prisma.JobOrderByWithRelationInput
    skip?: number
    take?: number
  }) {
    try {
      const { where, orderBy, skip, take } = options

      return await this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          logs: true,
          IndexJob: true,
        },
      })
    } catch (error) {
      this.logger.error('작업 목록 조회 실패:', error)
      throw error
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.job.delete({
        where: { id },
      })
    } catch (error) {
      this.logger.error(`작업 삭제 실패 (ID: ${id}):`, error)
      throw error
    }
  }

  async deleteMany(ids: string[]) {
    try {
      return await this.prisma.job.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      })
    } catch (error) {
      this.logger.error(`다중 작업 삭제 실패:`, error)
      throw error
    }
  }

  async findNextPendingJob() {
    try {
      return await this.prisma.job.findFirst({
        where: {
          status: JobStatus.PENDING,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          logs: true,
          IndexJob: true,
        },
      })
    } catch (error) {
      this.logger.error('대기 중인 작업 조회 실패:', error)
      throw error
    }
  }

  // 등록대기 -> 등록요청
  async pendingToRequest(id: string) {
    return this.update(id, { status: JobStatus.REQUEST, resultMsg: '등록요청으로 전환됨' })
  }

  // 등록요청 -> 등록대기
  async requestToPending(id: string) {
    return this.update(id, { status: JobStatus.PENDING, resultMsg: '등록대기로 전환됨' })
  }

  // 벌크 등록대기 -> 등록요청
  async bulkPendingToRequest(ids: string[]) {
    const jobs = await this.findAll({ where: { id: { in: ids }, status: JobStatus.PENDING } })
    const results = await Promise.all(
      jobs.map(job => this.update(job.id, { status: JobStatus.REQUEST, resultMsg: '등록요청으로 전환됨' })),
    )
    return { success: true, message: `${results.length}개 등록요청 전환` }
  }

  // 벌크 등록요청 -> 등록대기
  async bulkRequestToPending(ids: string[]) {
    const jobs = await this.findAll({ where: { id: { in: ids }, status: JobStatus.REQUEST } })
    const results = await Promise.all(
      jobs.map(job => this.update(job.id, { status: JobStatus.PENDING, resultMsg: '등록대기로 전환됨' })),
    )
    return { success: true, message: `${results.length}개 등록대기 전환` }
  }
}

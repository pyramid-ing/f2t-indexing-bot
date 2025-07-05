import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { CreateJobDto, GetJobsOptions, UpdateJobDto } from './job.types'

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name)

  constructor(private readonly prisma: PrismaService) {}

  async createJob(dto: CreateJobDto) {
    try {
      return await this.prisma.job.create({
        data: {
          type: dto.type,
          status: 'pending',
          data: JSON.stringify(dto.data),
        },
        include: {
          logs: true,
        },
      })
    } catch (error) {
      this.logger.error('작업 생성 실패:', error)
      throw error
    }
  }

  async updateJob(id: number, dto: UpdateJobDto) {
    try {
      const updateData: any = {}

      if (dto.status) {
        updateData.status = dto.status
      }

      if (dto.data) {
        updateData.data = JSON.stringify(dto.data)
      }

      return await this.prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          logs: true,
        },
      })
    } catch (error) {
      this.logger.error(`작업 업데이트 실패 (ID: ${id}):`, error)
      throw error
    }
  }

  async getJob(id: number) {
    try {
      return await this.prisma.job.findUnique({
        where: { id },
        include: {
          logs: true,
        },
      })
    } catch (error) {
      this.logger.error(`작업 조회 실패 (ID: ${id}):`, error)
      throw error
    }
  }

  async getJobs(options: GetJobsOptions = {}) {
    try {
      const { status, type, skip = 0, take = 10 } = options
      const where: any = {}

      if (status) {
        where.status = status
      }

      if (type) {
        where.type = type
      }

      return await this.prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          logs: true,
        },
      })
    } catch (error) {
      this.logger.error('작업 목록 조회 실패:', error)
      throw error
    }
  }

  async deleteJob(id: number) {
    try {
      return await this.prisma.job.delete({
        where: { id },
      })
    } catch (error) {
      this.logger.error(`작업 삭제 실패 (ID: ${id}):`, error)
      throw error
    }
  }
}

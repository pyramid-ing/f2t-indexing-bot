import { Injectable } from '@nestjs/common'
import { CreateJobLogDto } from '../job/job.types'
import { JobLog } from '@prisma/client'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'

@Injectable()
export class JobLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJobLogDto): Promise<JobLog> {
    return this.prisma.jobLog.create({
      data,
    })
  }

  async findByJobId(jobId: string): Promise<JobLog[]> {
    return this.prisma.jobLog.findMany({
      where: {
        jobId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  async findLatestByJobId(jobId: string): Promise<JobLog | null> {
    return this.prisma.jobLog.findFirst({
      where: {
        jobId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}

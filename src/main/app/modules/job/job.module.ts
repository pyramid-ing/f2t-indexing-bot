import { Module } from '@nestjs/common'
import { JobController } from './job.controller'
import { JobService } from './job.service'
import { JobLogsService } from '../job-logs/job-logs.service'
import { JobQueueProcessor } from './job-queue.processor'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobLogService } from './job-log.service'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { PrismaModule } from '@main/app/modules/common/prisma/prisma.module'

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [JobController],
  providers: [JobService, JobLogsService, JobQueueProcessor, JobLogService, PrismaService],
  exports: [JobService, JobLogsService, JobLogService],
})
export class JobModule {}

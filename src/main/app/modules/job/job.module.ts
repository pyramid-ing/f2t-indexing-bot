import { Module } from '@nestjs/common'
import { JobController } from './job.controller'
import { JobLogsService } from '../job-logs/job-logs.service'
import { JobQueueProcessor } from './job-queue.processor'
import { CommonModule } from '@main/app/modules/common/common.module'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'

@Module({
  imports: [CommonModule],
  controllers: [JobController],
  providers: [JobLogsService, JobQueueProcessor, PrismaService],
  exports: [JobLogsService],
})
export class JobModule {}

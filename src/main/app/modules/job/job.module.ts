import { Module } from '@nestjs/common'
import { JobController } from './job.controller'
import { JobLogsService } from '../job-logs/job-logs.service'
import { JobQueueProcessor } from './job-queue.processor'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobService } from '@main/app/modules/job/job.service'
import { IndexJobModule } from '@main/app/modules/index-job/index-job.module'

@Module({
  imports: [CommonModule, IndexJobModule],
  controllers: [JobController],
  providers: [JobLogsService, JobQueueProcessor, JobService],
  exports: [JobLogsService, JobService],
})
export class JobModule {}

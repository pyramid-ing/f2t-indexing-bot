import { Controller, Get, Param } from '@nestjs/common'
import { JobLogsService } from './job-logs.service'

@Controller('job-logs')
export class JobLogsController {
  constructor(private readonly jobLogsService: JobLogsService) {}

  @Get(':jobId')
  async findByJobId(@Param('jobId') jobId: string) {
    return this.jobLogsService.findByJobId(jobId)
  }

  @Get(':jobId/latest')
  async findLatestByJobId(@Param('jobId') jobId: string) {
    return this.jobLogsService.findLatestByJobId(jobId)
  }
}

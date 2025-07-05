import { JobStatus, JobType } from './job.types'

export interface JobResult {
  message: string
  resultUrl?: string
}

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  data: string
  createdAt: Date
  updatedAt: Date
}

export interface JobProcessor {
  process(job: Job): Promise<JobResult>
  canProcess(job: Job): boolean
}

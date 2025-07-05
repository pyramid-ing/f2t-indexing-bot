import { IndexProvider } from '../index-job/index-job.types'

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing`',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  INDEX = 'index',
}

export type JobLogLevel = 'info' | 'error'

interface IndexJobData {
  url: string
  provider: IndexProvider
  siteId: number
}

export interface CreateJobDto {
  type: JobType
  data: IndexJobData
}

export interface UpdateJobDto {
  status?: JobStatus
  data?: Record<string, any>
  resultMsg?: string
  errorMsg?: string
}

export interface CreateJobLogDto {
  jobId: string
  message: string
  level?: JobLogLevel
}

export interface GetJobsOptions {
  status?: JobStatus
  type?: JobType
  skip?: number
  take?: number
}

export interface JobWithLogs {
  id: string
  createdAt: Date
  updatedAt: Date
  status: JobStatus
  type: JobType
  data: string
  logs: {
    id: string
    createdAt: Date
    message: string
    level: JobLogLevel
  }[]
}

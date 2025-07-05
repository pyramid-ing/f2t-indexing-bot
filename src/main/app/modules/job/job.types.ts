export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
export type JobType = 'index'
export type JobLogLevel = 'info' | 'error'

export interface CreateJobDto {
  type: JobType
  data: Record<string, any>
}

export interface UpdateJobDto {
  status?: JobStatus
  data?: Record<string, any>
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
  id: number
  createdAt: Date
  updatedAt: Date
  status: JobStatus
  type: JobType
  data: string
  logs: {
    id: number
    createdAt: Date
    message: string
    level: JobLogLevel
  }[]
}

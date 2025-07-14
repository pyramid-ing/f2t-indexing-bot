import { IndexProvider } from '../index-job/index-job.types'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  INDEX = 'index',
}

export type JobLogLevel = 'info' | 'error'

export class IndexJobData {
  @IsNotEmpty()
  @IsString()
  url: string

  @IsNotEmpty()
  @IsEnum(IndexProvider)
  provider: IndexProvider

  @IsNotEmpty()
  @IsNumber()
  siteId: number
}

export class CreateJobDto {
  @IsNotEmpty()
  @IsEnum(JobType)
  type: JobType

  @ValidateNested()
  @Type(() => IndexJobData)
  data: IndexJobData
}

export class UpdateJobDto {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus

  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  data?: Record<string, any>

  @IsOptional()
  @IsString()
  resultMsg?: string

  @IsOptional()
  @IsString()
  errorMessage?: string
}

export interface CreateJobLogDto {
  jobId: string
  message: string
  level?: JobLogLevel
}

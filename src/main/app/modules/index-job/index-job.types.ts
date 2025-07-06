import { Transform } from 'class-transformer'
import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

export enum IndexProvider {
  GOOGLE = 'GOOGLE',
  NAVER = 'NAVER',
  DAUM = 'DAUM',
  BING = 'BING',
}

export class CreateIndexJobDto {
  @IsString()
  url: string

  @IsNumber()
  siteId: number

  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(IndexProvider)
  provider: IndexProvider

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  scheduledAt?: Date

  @IsOptional()
  @IsNumber()
  priority?: number
}

export interface SubmitUrlResult {
  id: string
  siteId: string
  url: string
  status: string
  scheduledAt: Date
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  errorMsg?: string
  resultMsg?: string
}

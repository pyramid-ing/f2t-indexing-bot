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

  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase?.() ?? value)
  @IsEnum(IndexProvider)
  provider?: IndexProvider

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledAt?: Date

  @IsOptional()
  @IsNumber()
  priority?: number
}

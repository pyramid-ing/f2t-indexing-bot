import { Transform } from 'class-transformer'
import { IsEnum, IsString, IsNumber, IsOptional, IsDate } from 'class-validator'

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

import { Body, Controller, Post } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { IsEnum, IsString, IsNumber, IsOptional, IsDate } from 'class-validator'
import { IndexJobService } from './index-job.service'

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

@Controller('index-job')
export class IndexJobController {
  constructor(private readonly indexJobService: IndexJobService) {}

  @Post()
  async create(@Body() createIndexJobDto: CreateIndexJobDto) {
    return this.indexJobService.create(createIndexJobDto)
  }
}

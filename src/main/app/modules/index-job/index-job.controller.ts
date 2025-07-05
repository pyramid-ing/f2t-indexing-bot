import { Body, Controller, Post } from '@nestjs/common'
import { IndexJobService } from './index-job.service'
import { CreateIndexJobDto } from './index-job.types'

@Controller('index-job')
export class IndexJobController {
  constructor(private readonly indexJobService: IndexJobService) {}

  @Post()
  async create(@Body() createIndexJobDto: CreateIndexJobDto) {
    return this.indexJobService.create(createIndexJobDto)
  }
}

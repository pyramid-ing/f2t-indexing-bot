import { Body, Controller, Post } from '@nestjs/common'
import { DaumIndexerService, DaumIndexerOptions } from './daum-indexer.service'

@Controller('daum-indexer')
export class DaumIndexerController {
  constructor(private readonly daumIndexerService: DaumIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: DaumIndexerOptions & { headless?: boolean }) {
    const results = await this.daumIndexerService.manualIndexing(body, body.headless ?? true)
    return { results }
  }
}

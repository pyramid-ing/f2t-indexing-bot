import { Body, Controller, Post } from '@nestjs/common'
import { DaumIndexerOptions, DaumIndexerService } from 'src/main/app/modules/daum-indexer/daum-indexer.service'

@Controller('daum-indexer')
export class DaumIndexerController {
  constructor(private readonly daumIndexerService: DaumIndexerService) {}

  @Post('manual')
  async manualIndex(@Body() body: DaumIndexerOptions & { headless?: boolean }) {
    const results = await this.daumIndexerService.manualIndexing(body, body.headless)
    return { results }
  }
}

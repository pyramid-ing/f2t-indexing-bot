import { Body, Controller, Post } from '@nestjs/common'
import { NaverIndexerService, NaverIndexerOptions } from './naver-indexer.service'

@Controller('naver-indexer')
export class NaverIndexerController {
  constructor(private readonly naverIndexerService: NaverIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: NaverIndexerOptions & { headless?: boolean }) {
    const results = await this.naverIndexerService.manualIndexing(body, body.headless ?? true)
    return { results }
  }
}

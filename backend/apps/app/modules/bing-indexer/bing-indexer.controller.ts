import { Body, Controller, Post } from '@nestjs/common'
import { BingIndexerService, BingIndexerOptions } from './bing-indexer.service'

@Controller('bing-indexer')
export class BingIndexerController {
  constructor(private readonly bingIndexerService: BingIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: BingIndexerOptions): Promise<any> {
    const results = await this.bingIndexerService.manualIndexing(body)
    return { results }
  }
}

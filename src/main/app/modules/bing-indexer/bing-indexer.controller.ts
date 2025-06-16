import { Body, Controller, Post } from '@nestjs/common'
import { BingIndexerService } from 'src/main/app/modules/bing-indexer/bing-indexer.service'

@Controller('bing-indexer')
export class BingIndexerController {
  constructor(private readonly bingIndexerService: BingIndexerService) {}

  @Post('manual')
  async manualIndexing(@Body() options: any) {
    return this.bingIndexerService.manualIndexing(options)
  }
}

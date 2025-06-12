import { Body, Controller, Post } from '@nestjs/common'
import { BingIndexerService, BingIndexerOptions } from './bing-indexer.service'

@Controller('bing-indexer')
export class BingIndexerController {
  constructor(private readonly bingIndexerService: BingIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: BingIndexerOptions): Promise<any> {
    await this.bingIndexerService.manualIndexing(body)
    return { success: true, message: 'Bing 색인 요청에 성공했습니다.' }
  }
}

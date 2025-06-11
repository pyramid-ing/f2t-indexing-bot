import { Body, Controller, Post } from '@nestjs/common'
import { GoogleIndexerService, GoogleIndexerOptions } from './google-indexer.service'

@Controller('google-indexer')
export class GoogleIndexerController {
  constructor(private readonly googleIndexerService: GoogleIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: GoogleIndexerOptions): Promise<any> {
    const results = await this.googleIndexerService.manualIndexing(body)
    return { results }
  }
}

import { Body, Controller, Post } from '@nestjs/common'
import { GoogleIndexerService } from 'src/main/app/modules/google/indexer/google-indexer.service'

@Controller('google-indexer')
export class GoogleIndexerController {
  constructor(private readonly googleIndexerService: GoogleIndexerService) {}

  @Post('manual')
  async manualIndexing(@Body() options: any) {
    return this.googleIndexerService.manualIndexing(options)
  }
}

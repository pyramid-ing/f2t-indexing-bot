import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BingIndexerService } from './bing-indexer.service'
import { BingIndexerController } from './bing-indexer.controller'

@Module({
  imports: [HttpModule],
  providers: [BingIndexerService],
  controllers: [BingIndexerController],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

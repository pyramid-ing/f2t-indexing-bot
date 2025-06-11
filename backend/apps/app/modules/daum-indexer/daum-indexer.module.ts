import { Module } from '@nestjs/common'
import { DaumIndexerService } from './daum-indexer.service'
import { DaumIndexerController } from './daum-indexer.controller'

@Module({
  providers: [DaumIndexerService],
  controllers: [DaumIndexerController],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

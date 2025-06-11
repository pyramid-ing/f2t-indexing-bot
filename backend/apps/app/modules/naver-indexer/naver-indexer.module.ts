import { Module } from '@nestjs/common'
import { NaverIndexerService } from './naver-indexer.service'
import { NaverIndexerController } from './naver-indexer.controller'

@Module({
  providers: [NaverIndexerService],
  controllers: [NaverIndexerController],
  exports: [NaverIndexerService],
})
export class NaverIndexerModule {}

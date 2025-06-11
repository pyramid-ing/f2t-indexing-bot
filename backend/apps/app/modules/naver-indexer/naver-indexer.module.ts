import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { NaverIndexerService } from './naver-indexer.service'
import { NaverIndexerController } from './naver-indexer.controller'

@Module({
  imports: [HttpModule],
  providers: [NaverIndexerService],
  controllers: [NaverIndexerController],
  exports: [NaverIndexerService],
})
export class NaverIndexerModule {}

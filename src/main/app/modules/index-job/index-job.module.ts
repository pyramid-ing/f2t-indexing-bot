import { Module } from '@nestjs/common'
import { IndexJobController } from './index-job.controller'
import { IndexJobService } from './index-job.service'
import { CommonModule } from '@main/app/modules/common/common.module'
import { BingIndexerModule } from '../bing-indexer/bing-indexer.module'
import { GoogleIndexerModule } from '../google/indexer/google-indexer.module'
import { NaverIndexerModule } from '../naver-indexer/naver-indexer.module'
import { DaumIndexerModule } from '../daum-indexer/daum-indexer.module'

@Module({
  imports: [CommonModule, BingIndexerModule, GoogleIndexerModule, NaverIndexerModule, DaumIndexerModule],
  controllers: [IndexJobController],
  providers: [IndexJobService],
  exports: [IndexJobService],
})
export class IndexJobModule {}

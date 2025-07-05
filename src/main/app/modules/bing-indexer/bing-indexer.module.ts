import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { BingIndexerController } from './bing-indexer.controller'
import { BingIndexerService } from './bing-indexer.service'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobModule } from '@main/app/modules/job/job.module'

@Module({
  imports: [HttpModule, SiteConfigModule, CommonModule, JobModule],
  controllers: [BingIndexerController],
  providers: [BingIndexerService],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

import { Module } from '@nestjs/common'
import { DaumIndexerService } from './daum-indexer.service'
import { DaumIndexerController } from './daum-indexer.controller'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobModule } from '@main/app/modules/job/job.module'

@Module({
  imports: [SiteConfigModule, CommonModule, JobModule],
  controllers: [DaumIndexerController],
  providers: [DaumIndexerService],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

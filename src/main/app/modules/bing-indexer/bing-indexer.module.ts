import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { BingIndexerService } from './bing-indexer.service'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobLogsModule } from '../job-logs/job-logs.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'

@Module({
  imports: [HttpModule, SiteConfigModule, CommonModule, JobLogsModule, SettingsModule],
  controllers: [],
  providers: [BingIndexerService],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

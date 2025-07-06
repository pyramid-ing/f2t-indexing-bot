import { Module } from '@nestjs/common'
import { DaumIndexerService } from './daum-indexer.service'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobLogsModule } from '@main/app/modules/job-logs/job-logs.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'

@Module({
  imports: [SiteConfigModule, CommonModule, JobLogsModule, SettingsModule],
  controllers: [],
  providers: [DaumIndexerService],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

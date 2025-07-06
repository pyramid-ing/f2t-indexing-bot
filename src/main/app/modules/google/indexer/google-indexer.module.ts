import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { GoogleIndexerService } from './google-indexer.service'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { GoogleAuthService } from '@main/app/modules/google/oauth/google-auth.service'
import { JobLogsModule } from '@main/app/modules/job-logs/job-logs.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'

@Module({
  imports: [HttpModule, SiteConfigModule, CommonModule, JobLogsModule, SettingsModule],
  controllers: [],
  providers: [GoogleIndexerService, GoogleAuthService],
  exports: [GoogleIndexerService],
})
export class GoogleIndexerModule {}

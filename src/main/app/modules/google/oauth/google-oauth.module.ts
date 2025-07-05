import { SettingsService } from '@main/app/modules/settings/settings.service'
import { Module } from '@nestjs/common'
import { CommonModule } from '@main/app/modules/common/common.module'

@Module({
  imports: [CommonModule],
  providers: [SettingsService],
  controllers: [],
})
export class GoogleOauthModule {}

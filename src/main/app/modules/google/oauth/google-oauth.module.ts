import { SettingsService } from '@main/app/modules/settings/settings.service'
import { Module } from '@nestjs/common'
import { GoogleOAuthController } from 'src/main/app/modules/google/oauth/google-oauth.controller'
import { CommonModule } from '@main/app/modules/common/common.module'

@Module({
  imports: [CommonModule],
  providers: [SettingsService],
  controllers: [GoogleOAuthController],
})
export class GoogleOauthModule {}

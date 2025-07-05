import { Module } from '@nestjs/common'
import { GoogleOauthModule } from './oauth/google-oauth.module'
import { GoogleIndexerModule } from './indexer/google-indexer.module'
import { GoogleAuthService } from './oauth/google-auth.service'
import { SettingsModule } from '../settings/settings.module'

@Module({
  imports: [SettingsModule, GoogleOauthModule, GoogleIndexerModule],
  providers: [GoogleAuthService],
  exports: [GoogleAuthService, GoogleOauthModule, GoogleIndexerModule],
})
export class GoogleModule {}

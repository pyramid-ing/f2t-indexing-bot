import { PrismaService } from '@main/app/shared/prisma.service'
import { SettingsService } from '@main/app/shared/settings.service'
import { Module } from '@nestjs/common'
import { GoogleOAuthController } from 'src/main/app/modules/google/oauth/google-oauth.controller'

@Module({
  providers: [SettingsService, PrismaService],
  controllers: [GoogleOAuthController],
})
export class GoogleOauthModule {}

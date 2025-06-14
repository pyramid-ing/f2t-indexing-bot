import { Module } from '@nestjs/common'
import { GoogleOAuthController } from './google-oauth.controller'
import { SettingsService } from '@prd/app/shared/settings.service'
import { PrismaService } from '@prd/app/shared/prisma.service'

@Module({
  providers: [SettingsService, PrismaService],
  controllers: [GoogleOAuthController],
})
export class GoogleOauthModule {}

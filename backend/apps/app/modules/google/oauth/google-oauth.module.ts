import { Module } from '@nestjs/common'
import { GoogleOAuthController } from './google-oauth.controller'
import { SettingsService } from '../../../shared/settings.service'
import { PrismaService } from '../../../shared/prisma.service'

@Module({
  providers: [SettingsService, PrismaService],
  controllers: [GoogleOAuthController],
})
export class GoogleOauthModule {}

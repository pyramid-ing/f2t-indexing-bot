import { Module } from '@nestjs/common'
import { GoogleOAuthController } from './google-oauth.controller'
import { DatabaseInitService } from '@prd/apps/app/shared/database-init.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  controllers: [GoogleOAuthController],
  providers: [DatabaseInitService, PrismaService],
})
export class GoogleOAuthModule {}

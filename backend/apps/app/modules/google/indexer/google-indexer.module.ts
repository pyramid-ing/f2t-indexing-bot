import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GoogleIndexerService } from './google-indexer.service'
import { GoogleIndexerController } from './google-indexer.controller'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'
import { SettingsService } from '../../../shared/settings.service'

@Module({
  imports: [HttpModule],
  providers: [GoogleIndexerService, GoogleAuthService, PrismaService, SettingsService],
  controllers: [GoogleIndexerController],
  exports: [GoogleIndexerService],
})
export class GoogleIndexerModule {}

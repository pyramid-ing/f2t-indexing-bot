import { GoogleAuthService } from '@main/app/shared/google-auth.service'
import { PrismaService } from '@main/app/shared/prisma.service'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { GoogleIndexerController } from 'src/main/app/modules/google/indexer/google-indexer.controller'
import { GoogleIndexerService } from 'src/main/app/modules/google/indexer/google-indexer.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  imports: [HttpModule],
  providers: [GoogleIndexerService, GoogleAuthService, PrismaService, SettingsService],
  controllers: [GoogleIndexerController],
  exports: [GoogleIndexerService],
})
export class GoogleIndexerModule {}

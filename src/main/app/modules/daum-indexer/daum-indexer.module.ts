import { Module } from '@nestjs/common'
import { DaumIndexerController } from 'src/main/app/modules/daum-indexer/daum-indexer.controller'
import { DaumIndexerService } from 'src/main/app/modules/daum-indexer/daum-indexer.service'
import { SiteConfigModule } from 'src/main/app/modules/site-config/site-config.module'
import { PrismaService } from 'src/main/app/shared/prisma.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  imports: [SiteConfigModule],
  providers: [DaumIndexerService, PrismaService, SettingsService],
  controllers: [DaumIndexerController],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

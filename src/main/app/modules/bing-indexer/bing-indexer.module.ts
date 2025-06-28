import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { BingIndexerController } from 'src/main/app/modules/bing-indexer/bing-indexer.controller'
import { BingIndexerService } from 'src/main/app/modules/bing-indexer/bing-indexer.service'
import { SiteConfigModule } from 'src/main/app/modules/site-config/site-config.module'
import { PrismaService } from 'src/main/app/shared/prisma.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  imports: [HttpModule, SiteConfigModule],
  providers: [BingIndexerService, PrismaService, SettingsService],
  controllers: [BingIndexerController],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

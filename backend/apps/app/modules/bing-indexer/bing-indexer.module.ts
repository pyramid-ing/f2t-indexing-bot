import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BingIndexerService } from './bing-indexer.service'
import { BingIndexerController } from './bing-indexer.controller'
import { PrismaService } from '../../shared/prisma.service'
import { SettingsService } from '../../shared/settings.service'

@Module({
  imports: [HttpModule],
  providers: [BingIndexerService, PrismaService, SettingsService],
  controllers: [BingIndexerController],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

import { Module } from '@nestjs/common'
import { DaumIndexerService } from './daum-indexer.service'
import { DaumIndexerController } from './daum-indexer.controller'
import { PrismaService } from '../../shared/prisma.service'
import { SettingsService } from '../../shared/settings.service'

@Module({
  providers: [DaumIndexerService, PrismaService, SettingsService],
  controllers: [DaumIndexerController],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

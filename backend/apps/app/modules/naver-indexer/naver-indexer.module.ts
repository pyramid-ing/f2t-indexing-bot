import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { NaverIndexerService } from './naver-indexer.service'
import { NaverIndexerController } from './naver-indexer.controller'
import { PrismaService } from '../../shared/prisma.service'
import { SettingsService } from '../../shared/settings.service'

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [NaverIndexerService, PrismaService, SettingsService],
  controllers: [NaverIndexerController],
  exports: [NaverIndexerService],
})
export class NaverIndexerModule {}

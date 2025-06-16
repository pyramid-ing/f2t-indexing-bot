import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NaverIndexerController } from 'src/main/app/modules/naver-indexer/naver-indexer.controller'
import { NaverIndexerService } from 'src/main/app/modules/naver-indexer/naver-indexer.service'
import { PrismaService } from 'src/main/app/shared/prisma.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [NaverIndexerService, PrismaService, SettingsService],
  controllers: [NaverIndexerController],
  exports: [NaverIndexerService],
})
export class NaverIndexerModule {}

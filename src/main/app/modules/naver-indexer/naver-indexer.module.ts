import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NaverAccountController } from 'src/main/app/modules/naver-indexer/naver-account.controller'
import { NaverAccountService } from 'src/main/app/modules/naver-indexer/naver-account.service'
import { NaverIndexerController } from 'src/main/app/modules/naver-indexer/naver-indexer.controller'
import { NaverIndexerService } from 'src/main/app/modules/naver-indexer/naver-indexer.service'
import { SiteConfigModule } from 'src/main/app/modules/site-config/site-config.module'
import { PrismaService } from 'src/main/app/shared/prisma.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  imports: [HttpModule, ConfigModule, SiteConfigModule],
  providers: [NaverIndexerService, NaverAccountService, PrismaService, SettingsService],
  controllers: [NaverIndexerController, NaverAccountController],
  exports: [NaverIndexerService, NaverAccountService],
})
export class NaverIndexerModule {}

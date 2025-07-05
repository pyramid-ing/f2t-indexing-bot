import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { NaverAccountService } from './naver-account.service'
import { NaverIndexerService } from './naver-indexer.service'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { CommonModule } from '@main/app/modules/common/common.module'
import { JobModule } from '@main/app/modules/job/job.module'

@Module({
  imports: [HttpModule, ConfigModule, SiteConfigModule, CommonModule, JobModule],
  controllers: [],
  providers: [NaverIndexerService, NaverAccountService],
  exports: [NaverIndexerService, NaverAccountService],
})
export class NaverIndexerModule {}

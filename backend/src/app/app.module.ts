import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import customConfig from '@prd/app/config/custom-config'
import { DaumIndexerModule } from '@prd/app/modules/daum-indexer/daum-indexer.module'
import { NaverIndexerModule } from '@prd/app/modules/naver-indexer/naver-indexer.module'
import { BingIndexerModule } from '@prd/app/modules/bing-indexer/bing-indexer.module'
import { GlobalExceptionFilter } from '@prd/filters/global-exception.filter'
import { GoogleModule } from '@prd/app/modules/google/google.module'
import { SiteConfigModule } from '@prd/app/modules/site-config/site-config.module'
import { PrismaService } from '@prd/app/shared/prisma.service'
import { SettingsModule } from '@prd/app/modules/settings/settings.module'
import { IndexingModule } from '@prd/app/modules/indexing/indexing.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [customConfig],
      isGlobal: true,
    }),
    DaumIndexerModule,
    NaverIndexerModule,
    BingIndexerModule,
    GoogleModule,
    SiteConfigModule,
    SettingsModule,
    IndexingModule,
  ],
  providers: [
    {
      // 의존성 주입이 가능하도록 module에도 설정해준다.
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    PrismaService,
  ],
  controllers: [],
})
export class AppModule {}

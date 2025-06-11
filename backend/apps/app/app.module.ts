import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import customConfig from '@prd/apps/config/custom-config'
import { DaumIndexerModule } from '@prd/apps/app/modules/daum-indexer/daum-indexer.module'
import { NaverIndexerModule } from '@prd/apps/app/modules/naver-indexer/naver-indexer.module'
import { BingIndexerModule } from '@prd/apps/app/modules/bing-indexer/bing-indexer.module'
import { GlobalExceptionFilter } from '@prd/apps/filters/global-exception.filter'
import { GoogleModule } from '@prd/apps/app/modules/google/google.module'

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
  ],
  providers: [
    {
      // 의존성 주입이 가능하도록 module에도 설정해준다.
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  controllers: [],
})
export class AppModule {}

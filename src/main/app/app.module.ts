import { join } from 'node:path'
import { ElectronModule } from '@doubleshot/nest-electron'
import customConfig from '@main/app/config/custom-config'
import { BingIndexerModule } from '@main/app/modules/bing-indexer/bing-indexer.module'
import { DaumIndexerModule } from '@main/app/modules/daum-indexer/daum-indexer.module'
import { GoogleModule } from '@main/app/modules/google/google.module'
import { NaverIndexerModule } from '@main/app/modules/naver-indexer/naver-indexer.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { GlobalExceptionFilter } from '@main/filters/global-exception.filter'
import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_PIPE, HttpAdapterHost } from '@nestjs/core'
import { app, BrowserWindow } from 'electron'
import { JobModule } from '@main/app/modules/job/job.module'
import { IndexJobModule } from '@main/app/modules/index-job/index-job.module'

@Module({
  imports: [
    ElectronModule.registerAsync({
      useFactory: async () => {
        const isDev = !app.isPackaged
        const win = new BrowserWindow({
          width: 1024,
          height: 768,
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.cjs'),
          },
        })

        win.on('closed', () => {
          win.destroy()
        })

        const URL = isDev ? process.env.DS_RENDERER_URL : `file://${join(app.getAppPath(), 'dist/render/index.html')}`

        win.loadURL(URL)

        return { win }
      },
    }),
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
    JobModule,
    IndexJobModule,
  ],
  providers: [
    {
      // 의존성 주입이 가능하도록 module에도 설정해준다.
      provide: APP_FILTER,
      useFactory: (httpAdapter: HttpAdapterHost) => {
        return new GlobalExceptionFilter(httpAdapter)
      },
      inject: [HttpAdapterHost],
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    PrismaService,
  ],
  controllers: [],
})
export class AppModule {}

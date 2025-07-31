import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { ElectronModule } from '@doubleshot/nest-electron'
import { BrowserWindow, Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { GlobalExceptionFilter } from '@main/filters/global-exception.filter'
import { ValidationPipe } from '@nestjs/common'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import customConfig from '@main/app/config/custom-config'
import { CommonModule } from '@main/app/modules/common/common.module'
import { SiteConfigModule } from '@main/app/modules/site-config/site-config.module'
import { SettingsModule } from '@main/app/modules/settings/settings.module'
import { JobModule } from '@main/app/modules/job/job.module'
import { IndexJobModule } from '@main/app/modules/index-job/index-job.module'
import { NaverAccountModule } from '@main/app/modules/naver-account/naver-account.module'
import { SitemapModule } from '@main/app/modules/sitemap/sitemap.module'

// 전역 변수로 트레이 관리
let tray: Tray | null = null
let isQuiting = false

// 트레이 설정 함수
function setupTray(win: BrowserWindow) {
  // 트레이 아이콘 경로 설정
  const iconDir = process.env.ICON_DIR
  if (!iconDir) {
    console.warn('ICON_DIR 환경 변수가 설정되지 않았습니다.')
    return
  }

  const iconPath = join(iconDir, 'tray-icon.png')

  // 아이콘 파일이 존재하는지 확인
  const fs = require('fs')
  if (!fs.existsSync(iconPath)) {
    console.warn(`트레이 아이콘 파일을 찾을 수 없습니다: ${iconPath}`)
    return
  }

  // 네이티브 이미지 생성
  const icon = nativeImage.createFromPath(iconPath)

  // 트레이 생성
  tray = new Tray(icon)
  tray.setToolTip('F2T Indexing Bot')

  // 컨텍스트 메뉴 생성
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '앱 보이기',
      click: () => {
        win.show()
        win.focus()
      },
    },
    {
      label: '대시보드 열기',
      click: () => {
        win.show()
        win.focus()
        win.webContents.send('navigate-to', '/dashboard')
      },
    },
    {
      label: '설정 열기',
      click: () => {
        win.show()
        win.focus()
        win.webContents.send('navigate-to', '/settings')
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuiting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // 트레이 아이콘 클릭 이벤트
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  // 더블클릭 이벤트
  tray.on('double-click', () => {
    win.show()
    win.focus()
  })
}

@Module({
  imports: [
    ElectronModule.registerAsync({
      useFactory: async () => {
        const isDev = !app.isPackaged

        const win = new BrowserWindow({
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600,
          autoHideMenuBar: true,
          icon: process.env.ICON_DIR ? join(process.env.ICON_DIR, 'tray-icon.png') : join(__dirname, '../../resources/tray_icons/tray-icon.png'),
          webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.cjs'),
          },
        })

        // 윈도우이 준비되면 보이기
        win.once('ready-to-show', () => {
          win.show()

          // 개발 모드가 아닐 때만 트레이 알림
          if (!isDev && tray) {
            tray.displayBalloon({
              title: 'F2T Indexing Bot',
              content: '앱이 시작되었습니다. 트레이에서 앱을 관리할 수 있습니다.',
            })
          }
        })

        // 개발 모드가 아닐 때만 트레이 관련 이벤트 처리
        if (!isDev) {
          // 창 닫기 이벤트 처리 (트레이로 숨김)
          win.on('close', event => {
            if (!isQuiting) {
              event.preventDefault()
              win.hide()
            }
          })

          // 윈도우가 숨겨질 때 트레이에 알림
          win.on('hide', () => {
            if (tray) {
              tray.setToolTip('F2T Indexing Bot (백그라운드에서 실행 중)')
            }
          })

          // 윈도우가 보여질 때 트레이 툴팁 복원
          win.on('show', () => {
            if (tray) {
              tray.setToolTip('F2T Indexing Bot')
            }
          })
        }

        win.on('closed', () => {
          win.destroy()
        })

        const URL = isDev ? process.env.DS_RENDERER_URL : `file://${join(app.getAppPath(), 'dist/render/index.html')}`

        win.loadURL(URL)

        // 개발 모드가 아닐 때만 트레이 설정
        if (!isDev) {
          setupTray(win)
        }

        return { win }
      },
    }),
    ConfigModule.forRoot({
      load: [customConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    SiteConfigModule,
    SettingsModule,
    JobModule,
    IndexJobModule,
    NaverAccountModule,
    SitemapModule,
  ],
  providers: [
    {
      // 의존성 주입이 가능하도록 module에도 설정해준다.
      provide: APP_FILTER,
      useFactory: () => {
        return new GlobalExceptionFilter()
      },
      inject: [],
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

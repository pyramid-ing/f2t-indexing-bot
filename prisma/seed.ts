import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 기본 앱 설정이 없으면 생성
  const appSettings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!appSettings) {
    const defaultAppSettings = {
      appVersion: '1.0.0',
      initialized: true,
      setupCompleted: false,
      theme: 'light',
      language: 'ko',
    }

    await prisma.settings.create({
      data: {
        id: 1,
        data: JSON.stringify(defaultAppSettings),
      },
    })
    console.log('기본 앱 설정 생성 완료')
  }

  // 전역 엔진 설정이 없으면 생성
  const globalEngineSettings = await prisma.settings.findFirst({ where: { id: 2 } })
  if (!globalEngineSettings) {
    const defaultGlobalSettings = {
      google: {
        use: false,
        serviceAccountEmail: '',
        privateKey: '',
        oauth2ClientId: '',
        oauth2ClientSecret: '',
        oauth2AccessToken: '',
        oauth2RefreshToken: '',
        oauth2TokenExpiry: '',
      },
      bing: { use: false, apiKey: '' },
      naver: { use: false, naverId: '', password: '' },
      daum: { use: false, siteUrl: '', password: '' },
    }

    await prisma.settings.create({
      data: {
        id: 2,
        data: JSON.stringify(defaultGlobalSettings),
      },
    })
    console.log('전역 엔진 설정 생성 완료')
  }

  console.log('시드 데이터 초기화 완료')
}

(async () => {
  try {
    await main()
  }
  catch (e) {
    console.error(e)
    process.exit(1)
  }
  finally {
    await prisma.$disconnect()
  }
})()

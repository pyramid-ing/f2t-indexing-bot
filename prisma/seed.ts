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

  // 기본 사이트 설정 예시 생성 (선택적)
  const existingSites = await prisma.site.count()
  if (existingSites === 0) {
    const defaultGoogleConfig = {
      use: false,
      serviceAccountJson: '',
    }

    const defaultBingConfig = {
      use: false,
      apiKey: '',
    }

    const defaultNaverConfig = {
      use: false,
      naverId: '',
      password: '',
      loginUrl: '',
    }

    const defaultDaumConfig = {
      use: false,
      siteUrl: '',
      password: '',
      loginUrl: '',
    }

    await prisma.site.create({
      data: {
        domain: 'example.com',
        name: '예시 사이트',
        siteUrl: 'https://example.com',
        isActive: false,
        googleConfig: JSON.stringify(defaultGoogleConfig),
        naverConfig: JSON.stringify(defaultNaverConfig),
        daumConfig: JSON.stringify(defaultDaumConfig),
        bingConfig: JSON.stringify(defaultBingConfig),
      },
    })
    console.log('기본 사이트 설정 생성 완료')
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

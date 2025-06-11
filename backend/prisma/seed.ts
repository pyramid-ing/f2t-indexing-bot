import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 데이터베이스 시드 시작...')

  // 기본 설정 데이터 생성
  const defaultSettings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      data: JSON.stringify({
        appVersion: '1.0.0',
        initialized: true,
        setupCompleted: false,
        theme: 'light',
        language: 'ko',
      }),
    },
  })

  console.log('✅ 기본 설정 생성:', defaultSettings)

  // 예시 사이트 설정 (선택적)
  const exampleSite = await prisma.site.upsert({
    where: { siteUrl: 'https://example.com' },
    update: {},
    create: {
      siteUrl: 'https://example.com',
      blogType: 'WORDPRESS',
      indexingUrls: JSON.stringify(['https://example.com/post1', 'https://example.com/post2']),
    },
  })

  console.log('✅ 예시 사이트 생성:', exampleSite)

  // 예시 사이트의 기본 설정들 생성
  await prisma.bingConfig.upsert({
    where: { siteId: exampleSite.id },
    update: {},
    create: {
      siteId: exampleSite.id,
      use: false,
      apiKey: null,
    },
  })

  await prisma.googleConfig.upsert({
    where: { siteId: exampleSite.id },
    update: {},
    create: {
      siteId: exampleSite.id,
      use: false,
      serviceAccountEmail: null,
      privateKey: null,
      oauth2ClientId: null,
      oauth2ClientSecret: null,
    },
  })

  await prisma.daumConfig.upsert({
    where: { siteId: exampleSite.id },
    update: {},
    create: {
      siteId: exampleSite.id,
      use: false,
      siteUrl: null,
      password: null,
    },
  })

  await prisma.naverConfig.upsert({
    where: { siteId: exampleSite.id },
    update: {},
    create: {
      siteId: exampleSite.id,
      use: false,
      naverId: null,
      password: null,
    },
  })

  console.log('✅ 예시 사이트 설정 완료')
  console.log('🎉 데이터베이스 시드 완료!')
}

main()
  .catch(e => {
    console.error('❌ 시드 실행 중 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
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

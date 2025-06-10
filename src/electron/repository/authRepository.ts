import { prisma } from './prismaClient'

const SINGLETON_ID = 1

export const getAuth = async () => {
  return prisma.auth.findUnique({ where: { id: SINGLETON_ID } })
}

export const saveAuth = async (email: string, token: string) => {
  return prisma.auth.upsert({
    where: { id: SINGLETON_ID },
    update: { email, token },
    create: { id: SINGLETON_ID, email, token },
  })
}

export const clearAuth = async () => {
  const existing = await getAuth()
  if (!existing) return null
  return prisma.auth.delete({ where: { id: SINGLETON_ID } })
}

// === 최초 1개 행 자동 생성 함수 ===
export const ensureAuthSingleton = async () => {
  const existing = await getAuth()
  if (!existing) {
    // 최초 생성 시 token은 빈 문자열로 생성
    await prisma.auth.create({
      data: { id: SINGLETON_ID, email: '', token: '' },
    })
  }
}

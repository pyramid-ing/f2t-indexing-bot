import { prisma } from './prismaClient'

export const defaultSettings = {
  apiKey: '',
  intervalSec: 60,
  useAi: false,
  aiProvider: 'openai',
  answerMode: 'manual',
  keywords: [],
  header: '',
  footer: '',
}

let settingsCache: any = null // 싱글톤 캐시

export const getSettings = async () => {
  if (settingsCache) return settingsCache

  let record = await prisma.settings.findUnique({ where: { id: 1 } })
  if (!record) {
    // 없으면 기본값으로 생성
    record = await prisma.settings.create({
      data: { id: 1, data: JSON.stringify(defaultSettings) },
    })
  }
  settingsCache = { ...defaultSettings, ...JSON.parse(record.data) }
  return settingsCache
}

export const saveSettings = async (data: any) => {
  const record = await prisma.settings.upsert({
    where: { id: 1 },
    update: { data: JSON.stringify(data) },
    create: { id: 1, data: JSON.stringify(data) },
  })
  settingsCache = { ...defaultSettings, ...JSON.parse(record.data) }
  return settingsCache
}

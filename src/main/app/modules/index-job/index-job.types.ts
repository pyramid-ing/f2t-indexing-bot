export type IndexProvider = 'GOOGLE' | 'NAVER' | 'DAUM' | 'BING'

export interface CreateIndexJobDto {
  siteId: string
  provider: IndexProvider
  url: string
  scheduledAt?: Date
  priority?: number
}

export interface IndexJobResult {
  success: boolean
  message: string
  resultUrl?: string
}

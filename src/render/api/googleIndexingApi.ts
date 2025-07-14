import { api } from '@render/api/apiClient'

export interface GoogleIndexingOptions {
  url?: string
  urls?: string[]
  siteId: string
  type?: 'URL_UPDATED' | 'URL_DELETED'
}

export interface IndexingResponse {
  success: boolean
  message: string
  data?: any
}

export async function indexUrl(siteId: string, url: string, type: string = 'URL_UPDATED'): Promise<IndexingResponse> {
  const response = await api.post('/google/indexing/url', { siteId, url, type })
  return response.data
}

export async function getIndexStatus(siteId: string, url: string): Promise<IndexingResponse> {
  const response = await api.get(`/google/indexing/status?siteId=${siteId}&url=${encodeURIComponent(url)}`)
  return response.data
}

export async function batchIndexUrls(
  siteId: string,
  urls: string[],
  type: string = 'URL_UPDATED',
): Promise<IndexingResponse> {
  const response = await api.post('/google/indexing/batch', { siteId, urls, type })
  return response.data
}

export async function manualIndexing(options: GoogleIndexingOptions): Promise<IndexingResponse> {
  const response = await api.post('/google/indexing/manual', options)
  return response.data
}

export async function submitUrl(siteId: string, url: string): Promise<IndexingResponse> {
  const response = await api.post('/google/indexing/submit', { siteId, url })
  return response.data
}

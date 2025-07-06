import { api } from '../api'

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

export const indexingApi = {
  indexUrl: async (siteId: string, url: string, type: string = 'URL_UPDATED'): Promise<IndexingResponse> => {
    const response = await api.post('/google/indexing/url', { siteId, url, type })
    return response.data
  },

  getIndexStatus: async (siteId: string, url: string): Promise<IndexingResponse> => {
    const response = await api.get(`/google/indexing/status?siteId=${siteId}&url=${encodeURIComponent(url)}`)
    return response.data
  },

  batchIndexUrls: async (siteId: string, urls: string[], type: string = 'URL_UPDATED'): Promise<IndexingResponse> => {
    const response = await api.post('/google/indexing/batch', { siteId, urls, type })
    return response.data
  },

  manualIndexing: async (options: GoogleIndexingOptions): Promise<IndexingResponse> => {
    const response = await api.post('/google/indexing/manual', options)
    return response.data
  },

  submitUrl: async (siteId: string, url: string): Promise<IndexingResponse> => {
    const response = await api.post('/google/indexing/submit', { siteId, url })
    return response.data
  },
}

import { api } from './apiClient'

export interface SitemapConfig {
  id: string
  name: string
  sitemapType: string
  isEnabled: boolean
  lastParsed?: string
}

export interface CreateSitemapConfigDto {
  name: string
  sitemapType: string
  isEnabled?: boolean
}

export interface UpdateSitemapConfigDto {
  name?: string
  sitemapType?: string
  isEnabled?: boolean
}

export interface IndexJob {
  id: string
  url: string
  provider: string
  status: string
  createdAt: string
  job?: {
    status: string
    result?: string
    errorMessage?: string
  }
}

export interface IndexJobsResponse {
  jobs: IndexJob[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const sitemapApi = {
  // 사이트맵 설정 목록 조회
  getSitemapConfigs: (siteId: number): Promise<SitemapConfig[]> => {
    return api.get(`/sitemap/configs/${siteId}`).then(res => res.data)
  },

  // 사이트맵 설정 생성
  createSitemapConfig: (siteId: number, data: CreateSitemapConfigDto): Promise<SitemapConfig> => {
    return api.post(`/sitemap/configs/${siteId}`, data).then(res => res.data)
  },

  // 사이트맵 설정 수정
  updateSitemapConfig: (id: string, data: UpdateSitemapConfigDto): Promise<SitemapConfig> => {
    return api.put(`/sitemap/configs/${id}`, data).then(res => res.data)
  },

  // 사이트맵 설정 삭제
  deleteSitemapConfig: (id: string): Promise<void> => {
    return api.delete(`/sitemap/configs/${id}`).then(res => res.data)
  },

  // 인덱싱 작업 목록 조회
  getIndexJobs: (siteId: number, page = 1, limit = 50): Promise<IndexJobsResponse> => {
    return api
      .get(`/sitemap/jobs/${siteId}`, {
        params: { page, limit },
      })
      .then(res => res.data)
  },

  // 수동 사이트맵 파싱
  parseSitemap: (siteId: number): Promise<{ message: string }> => {
    return api.post(`/sitemap/parse/${siteId}`).then(res => res.data)
  },
}

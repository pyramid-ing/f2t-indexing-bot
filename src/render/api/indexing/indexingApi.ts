import axios from 'axios'
import { API_BASE_URL, IndexProvider } from '../types'

export enum JobType {
  INDEX = 'index',
  GENERATE_TOPIC = 'generate_topic',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Job {
  id: string
  type: JobType
  subject: string
  desc: string
  status: JobStatus
  priority: number
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  resultMsg?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  logs?: JobLog[]
  indexJob?: IndexJob
}

export interface JobLog {
  id: string
  jobId: string
  message: string
  level: 'info' | 'warn' | 'error'
  createdAt: string
}

export interface IndexJob {
  id: string
  jobId: string
  siteId: number
  provider: IndexProvider
  url: string
  status: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export const indexingApi = {
  // 인덱서별 수동 인덱싱
  bingManualIndex: async (options: { siteId: number; url?: string; urls?: string[] }) => {
    const res = await axios.post(`${API_BASE_URL}/bing-indexer/manual`, options)
    return res.data
  },

  googleManualIndex: async (options: {
    siteId: number
    url?: string
    urls?: string[]
    type?: 'URL_UPDATED' | 'URL_DELETED'
  }) => {
    const res = await axios.post(`${API_BASE_URL}/google-indexer/manual`, options)
    return res.data
  },

  naverManualIndex: async (options: { siteId: number; urlsToIndex: string[] }) => {
    const res = await axios.post(`${API_BASE_URL}/naver-indexer/manual`, options)
    return res.data
  },

  daumManualIndex: async (options: { siteId: number; urlsToIndex: string[] }) => {
    const res = await axios.post(`${API_BASE_URL}/daum-indexer/manual`, options)
    return res.data
  },

  // 작업 관리
  getJobs: async (params: {
    status?: JobStatus
    search?: string
    orderBy?: string
    order?: 'asc' | 'desc'
    skip?: number
    take?: number
  }): Promise<Job[]> => {
    const res = await axios.get(`${API_BASE_URL}/jobs`, { params })
    return res.data
  },

  getJob: async (id: string): Promise<Job> => {
    const res = await axios.get(`${API_BASE_URL}/jobs/${id}`)
    return res.data
  },

  getJobLogs: async (jobId: string): Promise<JobLog[]> => {
    const res = await axios.get(`${API_BASE_URL}/jobs/${jobId}/logs`)
    return res.data
  },

  getLatestJobLog: async (jobId: string): Promise<JobLog | null> => {
    const res = await axios.get(`${API_BASE_URL}/jobs/${jobId}/logs/latest`)
    return res.data
  },

  retryJob: async (id: string) => {
    const res = await axios.post(`${API_BASE_URL}/jobs/${id}/retry`)
    return res.data
  },

  retryJobs: async (ids: string[]) => {
    const res = await axios.post(`${API_BASE_URL}/jobs/retry`, { ids })
    return res.data
  },

  deleteJob: async (id: string) => {
    const res = await axios.delete(`${API_BASE_URL}/jobs/${id}`)
    return res.data
  },

  deleteJobs: async (ids: string[]) => {
    const res = await axios.delete(`${API_BASE_URL}/jobs`, { data: { ids } })
    return res.data
  },

  createIndexJob: async (options: { siteId: number; url: string }) => {
    const res = await axios.post(`${API_BASE_URL}/index-jobs`, options)
    return res.data
  },

  // URL 체크
  checkExistingUrls: async (urls: string[], providers: IndexProvider[]): Promise<Record<IndexProvider, string[]>> => {
    const res = await axios.post(`${API_BASE_URL}/indexer/check-urls`, { urls, providers })
    return res.data
  },
}

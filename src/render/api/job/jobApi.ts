import { api } from '../api'

export interface Job {
  id: string
  siteId: string
  siteName: string
  provider: string
  url: string
  status: JobStatus
  createdAt: string
  scheduledAt: string
  startedAt?: string
  completedAt?: string
  errorMsg?: string
  resultMsg?: string
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

const BASE_PATH = '/jobs'

export const jobApi = {
  getAll: async (): Promise<Job[]> => {
    const response = await api.get(BASE_PATH)
    return response.data
  },

  getById: async (id: string): Promise<Job> => {
    const response = await api.get(`${BASE_PATH}/${id}`)
    return response.data
  },

  create: async (data: Omit<Job, 'id' | 'createdAt' | 'completedAt' | 'status'>): Promise<Job> => {
    const response = await api.post(BASE_PATH, data)
    return response.data
  },

  retry: async (id: string): Promise<Job> => {
    const response = await api.post(`${BASE_PATH}/${id}/retry`)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`)
  },
}

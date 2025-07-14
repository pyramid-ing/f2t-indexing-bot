import { api } from '@render/api/apiClient'

const BASE_PATH = '/jobs'

export type IndexProvider = 'GOOGLE' | 'BING' | 'NAVER' | 'DAUM'

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

export async function createIndexJob(options: { siteId: number; url: string }): Promise<Job> {
  const res = await api.post(`/index-job`, options)
  return res.data
}

export async function getAllJobs(): Promise<Job[]> {
  const response = await api.get(BASE_PATH)
  return response.data
}

export async function getJobById(id: string): Promise<Job> {
  const response = await api.get(`${BASE_PATH}/${id}`)
  return response.data
}

export async function createJob(data: Omit<Job, 'id' | 'createdAt' | 'completedAt' | 'status'>): Promise<Job> {
  const response = await api.post(BASE_PATH, data)
  return response.data
}

export async function retryJob(id: string): Promise<Job> {
  const response = await api.post(`${BASE_PATH}/${id}/retry`)
  return response.data
}

export async function deleteJob(id: string): Promise<void> {
  await api.delete(`${BASE_PATH}/${id}`)
}

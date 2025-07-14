import { api } from '@render/api/apiClient'

const BASE_PATH = '/jobs'

export type IndexProvider = 'GOOGLE' | 'BING' | 'NAVER' | 'DAUM'

export enum JobType {
  INDEX = 'index',
  GENERATE_TOPIC = 'generate_topic',
}

export enum JobStatus {
  PENDING = 'pending',
  REQUEST = 'request',
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
  IndexJob?: IndexJob
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

export async function updateJobScheduledAt(id: string, scheduledAt: string | null): Promise<Job> {
  const response = await api.patch(`${BASE_PATH}/${id}`, { scheduledAt })
  return response.data
}

export async function getJobLogs(jobId: string): Promise<JobLog[]> {
  const response = await api.get(`${BASE_PATH}/${jobId}/logs`)
  return response.data
}

export async function getLatestJobLog(jobId: string): Promise<JobLog | null> {
  const response = await api.get(`${BASE_PATH}/${jobId}/logs/latest`)
  return response.data
}

export async function retryJobs(ids: string[]): Promise<{ success: boolean; message: string }> {
  const response = await api.post(`${BASE_PATH}/retry`, { ids })
  return response.data
}

export async function deleteJobs(ids: string[]): Promise<{ success: boolean; message: string }> {
  const response = await api.delete(BASE_PATH, { data: { ids } })
  return response.data
}

export async function requestToPending(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post(`${BASE_PATH}/${id}/request-to-pending`, {})
  return response.data
}

export async function pendingToRequest(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post(`${BASE_PATH}/${id}/pending-to-request`, {})
  return response.data
}

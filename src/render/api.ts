import axios from 'axios'

export type IndexProvider = 'GOOGLE' | 'BING' | 'NAVER' | 'DAUM'

const API_BASE_URL = 'http://localhost:3553'

// 에러 코드 enum
export enum ErrorCode {
  // Google API 에러들
  GOOGLE_AUTH_FAILED = 'GOOGLE_AUTH_FAILED',
  GOOGLE_TOKEN_EXPIRED = 'GOOGLE_TOKEN_EXPIRED',
  GOOGLE_TOKEN_INVALID = 'GOOGLE_TOKEN_INVALID',
  GOOGLE_API_QUOTA_EXCEEDED = 'GOOGLE_API_QUOTA_EXCEEDED',
  GOOGLE_API_PERMISSION_DENIED = 'GOOGLE_API_PERMISSION_DENIED',
  GOOGLE_INDEXER_FAILED = 'GOOGLE_INDEXER_FAILED',
  GOOGLE_BLOGGER_API_FAILED = 'GOOGLE_BLOGGER_API_FAILED',
  GOOGLE_OAUTH_CONFIG_MISSING = 'GOOGLE_OAUTH_CONFIG_MISSING',
  GOOGLE_SERVICE_ACCOUNT_INVALID = 'GOOGLE_SERVICE_ACCOUNT_INVALID',

  // Bing API 에러들
  BING_AUTH_FAILED = 'BING_AUTH_FAILED',
  BING_API_KEY_MISSING = 'BING_API_KEY_MISSING',
  BING_API_KEY_INVALID = 'BING_API_KEY_INVALID',
  BING_API_QUOTA_EXCEEDED = 'BING_API_QUOTA_EXCEEDED',
  BING_SUBMISSION_FAILED = 'BING_SUBMISSION_FAILED',
  BING_INVALID_URL = 'BING_INVALID_URL',
  BING_SITE_NOT_VERIFIED = 'BING_SITE_NOT_VERIFIED',

  // Naver API 에러들
  NAVER_AUTH_FAILED = 'NAVER_AUTH_FAILED',
  NAVER_LOGIN_REQUIRED = 'NAVER_LOGIN_REQUIRED',
  NAVER_SESSION_EXPIRED = 'NAVER_SESSION_EXPIRED',
  NAVER_SUBMISSION_FAILED = 'NAVER_SUBMISSION_FAILED',
  NAVER_SITE_NOT_REGISTERED = 'NAVER_SITE_NOT_REGISTERED',
  NAVER_BROWSER_ERROR = 'NAVER_BROWSER_ERROR',
  NAVER_PAGE_NOT_FOUND = 'NAVER_PAGE_NOT_FOUND',

  // Daum API 에러들
  DAUM_AUTH_FAILED = 'DAUM_AUTH_FAILED',
  DAUM_SUBMISSION_FAILED = 'DAUM_SUBMISSION_FAILED',
  DAUM_INVALID_URL = 'DAUM_INVALID_URL',
  DAUM_SITE_NOT_REGISTERED = 'DAUM_SITE_NOT_REGISTERED',
  DAUM_REQUEST_FAILED = 'DAUM_REQUEST_FAILED',

  // 일반 에러들
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

// 정규화된 에러 응답 타입
export interface ErrorResponse {
  success: false
  statusCode: number
  timestamp: string
  path: string
  error: string
  message: string
  code?: ErrorCode
  service?: string
  operation?: string
  details?: {
    stack?: string[]
    name?: string
    url?: string
    method?: string
    response?: any
    code?: string
    category?: string
    postData?: any
    ffmpegError?: string
    inputData?: any
    siteUrl?: string
    blogId?: string
    postId?: string
    configType?: string
    isExpired?: boolean
    additionalInfo?: Record<string, any>
  }
}

// 에러 메시지 생성 헬퍼 함수
export function getErrorMessage(error: any): string {
  if (error.response?.data) {
    const errorData = error.response.data as ErrorResponse

    // 정규화된 에러 구조인 경우
    if (errorData.code && errorData.service && errorData.operation) {
      return `[${errorData.service}/${errorData.operation}] ${errorData.message}`
    }

    // 기본 에러 메시지
    return errorData.message || error.message
  }

  return error.message || '알 수 없는 오류가 발생했습니다.'
}

// 에러 상세 정보 생성 헬퍼 함수
export function getErrorDetails(error: any): string | undefined {
  if (error.response?.data?.details?.additionalInfo) {
    const details = error.response.data.details.additionalInfo
    const detailStrings = []

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'boolean') {
        detailStrings.push(`${key}: ${value ? '있음' : '없음'}`)
      } else if (typeof value === 'string' || typeof value === 'number') {
        detailStrings.push(`${key}: ${value}`)
      }
    }

    return detailStrings.length > 0 ? detailStrings.join(', ') : undefined
  }

  return undefined
}

// 검색엔진별 설정 인터페이스
export interface GoogleConfig {
  use: boolean
  serviceAccountJson: string
}

export interface BingConfig {
  use: boolean
  apiKey: string
}

export interface NaverConfig {
  use: boolean
  selectedNaverAccountId?: number // 선택된 네이버 계정 ID
  loginUrl: string
  headless?: boolean
}

export interface DaumConfig {
  use: boolean
  siteUrl: string
  password: string
  loginUrl: string
  headless?: boolean
}

// 사이트 설정 관련 (새로운 구조)
export interface SiteConfig {
  id?: number
  domain: string
  name: string
  siteUrl: string
  isActive?: boolean
  googleConfig?: GoogleConfig
  naverConfig?: NaverConfig
  daumConfig?: DaumConfig
  bingConfig?: BingConfig
  createdAt?: string
  updatedAt?: string
}

// 전역 엔진 설정 인터페이스 (레거시 호환용)
export interface GlobalEngineSettings {
  google: {
    use: boolean
    serviceAccountJson: string
    oauth2ClientId: string
    oauth2ClientSecret: string
    oauth2AccessToken: string
    oauth2RefreshToken: string
    oauth2TokenExpiry: string
  }
  bing: {
    use: boolean
    apiKey: string
  }
  naver: {
    use: boolean
    naverId: string
    password: string
    headless: boolean
  }
  daum: {
    use: boolean
    siteUrl: string
    password: string
    headless: boolean
  }
}

// 앱 상태 관련
export async function getAppStatus() {
  const res = await axios.get(`${API_BASE_URL}/settings/status`)
  return res.data
}

// 사이트 설정 관리 (새로운 구조)
export async function createSiteConfig(config: SiteConfig) {
  const res = await axios.post(`${API_BASE_URL}/sites`, config)
  return res.data
}

export async function getSiteConfig(siteId: number) {
  const res = await axios.get(`${API_BASE_URL}/sites/${siteId}`)
  return res.data
}

export async function getSiteConfigByDomain(domain: string) {
  const res = await axios.get(`${API_BASE_URL}/sites/domain/${encodeURIComponent(domain)}`)
  return res.data
}

export async function updateSiteConfig(siteId: number, updates: Partial<SiteConfig>) {
  const res = await axios.put(`${API_BASE_URL}/sites/${siteId}`, updates)
  return res.data
}

export async function updateSiteEngineConfigs(
  siteId: number,
  configs: {
    google?: GoogleConfig
    naver?: NaverConfig
    daum?: DaumConfig
    bing?: BingConfig
  },
) {
  const res = await axios.put(`${API_BASE_URL}/sites/${siteId}/engines`, configs)
  return res.data
}

export async function deleteSiteConfig(siteId: number) {
  const res = await axios.delete(`${API_BASE_URL}/sites/${siteId}`)
  return res.data
}

export async function getAllSiteConfigs() {
  const res = await axios.get(`${API_BASE_URL}/sites`)
  return res.data
}

export async function getActiveSiteConfigs() {
  const res = await axios.get(`${API_BASE_URL}/sites/active`)
  return res.data
}

// 인덱서 관련 (새로운 구조)
export async function bingManualIndex(options: { siteId: number; url?: string; urls?: string[] }) {
  const res = await axios.post(`${API_BASE_URL}/bing-indexer/manual`, options)
  return res.data
}

export async function googleManualIndex(options: {
  siteId: number
  url?: string
  urls?: string[]
  type?: 'URL_UPDATED' | 'URL_DELETED'
}) {
  const res = await axios.post(`${API_BASE_URL}/google-indexer/manual`, options)
  return res.data
}

export async function naverManualIndex(options: { siteId: number; urlsToIndex: string[] }) {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/manual`, options)
  return res.data
}

export async function daumManualIndex(options: { siteId: number; urlsToIndex: string[] }) {
  const res = await axios.post(`${API_BASE_URL}/daum-indexer/manual`, options)
  return res.data
}

// 레거시 전역 설정 (호환성용)
export async function getGlobalSettings(): Promise<{ success: boolean; data: GlobalEngineSettings }> {
  const res = await axios.get(`${API_BASE_URL}/settings/global`)
  return res.data
}

export interface NaverLoginStatus {
  isLoggedIn: boolean
  needsLogin: boolean
  message: string
}

export async function checkNaverLoginStatus(naverId?: string): Promise<NaverLoginStatus> {
  const params = naverId ? { naverId } : {}
  const res = await axios.get(`${API_BASE_URL}/naver-indexer/login-status`, { params })
  return res.data
}

export async function openNaverLoginBrowser(naverId?: string): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/open-login`, { naverId })
  return res.data
}

export async function checkNaverLoginComplete(naverId?: string): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/check-login-complete`, { naverId })
  return res.data
}

export async function closeNaverLoginBrowser(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/close-login`)
  return res.data
}

// 네이버 계정 관리 API (중앙 관리)
export interface NaverAccount {
  id: number
  name: string
  naverId: string
  password: string
  isActive: boolean
  isLoggedIn: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export async function getAllNaverAccounts(): Promise<NaverAccount[]> {
  const res = await axios.get(`${API_BASE_URL}/naver-accounts`)
  return res.data.data || []
}

export async function getActiveNaverAccounts(): Promise<NaverAccount[]> {
  const res = await axios.get(`${API_BASE_URL}/naver-accounts/active`)
  return res.data.data || []
}

export async function getNaverAccountByNaverId(naverId: string): Promise<NaverAccount | null> {
  const res = await axios.get(`${API_BASE_URL}/naver-accounts/naver-id/${naverId}`)
  return res.data.data
}

export async function createNaverAccount(data: {
  name: string
  naverId: string
  password: string
  isActive?: boolean
}): Promise<NaverAccount> {
  const res = await axios.post(`${API_BASE_URL}/naver-accounts`, data)
  return res.data.data
}

export async function updateNaverAccount(id: number, data: Partial<NaverAccount>): Promise<NaverAccount> {
  const res = await axios.put(`${API_BASE_URL}/naver-accounts/${id}`, data)
  return res.data.data
}

export async function deleteNaverAccount(id: number): Promise<{ success: boolean; message: string }> {
  const res = await axios.delete(`${API_BASE_URL}/naver-accounts/${id}`)
  return res.data
}

export async function updateNaverAccountLoginStatus(
  naverId: string,
  isLoggedIn: boolean,
  lastLogin?: string,
): Promise<NaverAccount> {
  const res = await axios.put(`${API_BASE_URL}/naver-accounts/naver-id/${naverId}/login-status`, {
    isLoggedIn,
    lastLogin,
  })
  return res.data.data
}

// URL에서 사이트 설정 자동 매칭
export async function findSiteConfigByUrl(url: string): Promise<SiteConfig | null> {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace(/^www\./, '') // www 제거

    const res = await getSiteConfigByDomain(domain)
    if (res.success && res.data) {
      return res.data
    }

    // 전체 호스트명으로도 시도
    const res2 = await getSiteConfigByDomain(urlObj.hostname)
    if (res2.success && res2.data) {
      return res2.data
    }

    return null
  } catch (error) {
    return null
  }
}

export async function checkExistingUrls(
  urls: string[],
  providers: IndexProvider[],
): Promise<Record<IndexProvider, string[]>> {
  const res = await axios.post(`${API_BASE_URL}/indexing/check-existing`, {
    urls,
    providers,
  })
  return res.data
}

export async function getIndexingLogCount(siteId: number) {
  const res = await axios.get(`${API_BASE_URL}/indexing/logs/${siteId}/count`)
  return res.data
}

// Job 관련 타입
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

// Job API
export async function getJobs(params: {
  status?: JobStatus
  search?: string
  orderBy?: string
  order?: 'asc' | 'desc'
  skip?: number
  take?: number
}): Promise<Job[]> {
  const res = await axios.get(`${API_BASE_URL}/jobs`, { params })
  return res.data
}

export async function getJob(id: string): Promise<Job> {
  const res = await axios.get(`${API_BASE_URL}/jobs/${id}`)
  return res.data
}

export async function getJobLogs(jobId: string): Promise<JobLog[]> {
  const res = await axios.get(`${API_BASE_URL}/jobs/${jobId}/logs`)
  return res.data
}

export async function getLatestJobLog(jobId: string): Promise<JobLog | null> {
  const res = await axios.get(`${API_BASE_URL}/jobs/${jobId}/logs/latest`)
  return res.data
}

export async function retryJob(id: string): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/jobs/${id}/retry`)
  return res.data
}

export async function retryJobs(ids: string[]): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/jobs/retry`, { ids })
  return res.data
}

export async function deleteJob(id: string): Promise<{ success: boolean; message: string }> {
  const res = await axios.delete(`${API_BASE_URL}/jobs/${id}`)
  return res.data
}

export async function deleteJobs(ids: string[]): Promise<{ success: boolean; message: string }> {
  const res = await axios.delete(`${API_BASE_URL}/jobs`, { data: { ids } })
  return res.data
}

import axios from 'axios'

export type IndexProvider = 'GOOGLE' | 'BING' | 'NAVER' | 'DAUM'

const API_BASE_URL = 'http://localhost:3030'

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

// 사이트 설정 관련
export interface SiteConfig {
  name: string
  siteUrl: string
}

// 전역 엔진 설정 인터페이스
export interface GlobalEngineSettings {
  google: {
    use: boolean
    serviceAccountEmail: string
    privateKey: string
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

// 사이트 설정 관리 (간소화됨)
export async function createSiteConfig(config: SiteConfig) {
  const res = await axios.post(`${API_BASE_URL}/sites`, config)
  return res.data
}

export async function getSiteConfig(siteUrl: string) {
  const res = await axios.get(`${API_BASE_URL}/sites/${encodeURIComponent(siteUrl)}`)
  return res.data
}

export async function updateSiteConfig(siteUrl: string, updates: Partial<SiteConfig>) {
  const res = await axios.put(`${API_BASE_URL}/sites/${encodeURIComponent(siteUrl)}`, updates)
  return res.data
}

export async function deleteSiteConfig(siteUrl: string) {
  const res = await axios.delete(`${API_BASE_URL}/sites/${encodeURIComponent(siteUrl)}`)
  return res.data
}

export async function getAllSiteConfigs() {
  const res = await axios.get(`${API_BASE_URL}/sites`)
  return res.data
}

// 인덱서 관련
export async function bingManualIndex(options: { siteUrl: string; url?: string; urls?: string[] }) {
  const res = await axios.post(`${API_BASE_URL}/bing-indexer/manual-index`, options)
  return res.data
}

export async function googleManualIndex(options: {
  siteUrl: string
  url?: string
  urls?: string[]
  type?: 'URL_UPDATED' | 'URL_DELETED'
}) {
  const res = await axios.post(`${API_BASE_URL}/google-indexer/manual-index`, options)
  return res.data
}

export async function naverManualIndex(options: {
  siteUrl: string
  urlsToIndex: string[]
  naverId?: string
  naverPw?: string
}) {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/manual-index`, options)
  return res.data
}

export async function daumManualIndex(options: { siteUrl: string; urlsToIndex: string[]; pin?: string }) {
  const res = await axios.post(`${API_BASE_URL}/daum-indexer/manual-index`, options)
  return res.data
}

// Google OAuth 관련 - 서버 기반 처리
export async function getGoogleOAuthStatus() {
  const res = await axios.get(`${API_BASE_URL}/google-oauth/status`)
  return res.data
}

export async function googleOAuthLogout() {
  const res = await axios.post(`${API_BASE_URL}/google-oauth/logout`)
  return res.data
}

export async function refreshGoogleToken() {
  const res = await axios.post(`${API_BASE_URL}/google-oauth/refresh-token`)
  return res.data
}

// Google Blogger API
export async function getBloggerPosts(options: {
  blogId?: string
  blogUrl?: string
  accessToken: string
  maxResults?: number
  pageToken?: string
  status?: 'live' | 'draft' | 'scheduled'
}) {
  const res = await axios.post(`${API_BASE_URL}/google-blogger/posts`, options)
  return res.data
}

export async function getBloggerUserBlogs(accessToken: string) {
  const res = await axios.get(`${API_BASE_URL}/google-blogger/user/blogs`, {
    params: { accessToken },
  })
  return res.data
}

export async function getBloggerInfo(blogUrl: string, accessToken: string) {
  const res = await axios.post(`${API_BASE_URL}/google-blogger/blogs/by-url`, {
    blogUrl,
    accessToken,
  })
  return res.data
}

export async function getBloggerPost(blogId: string, postId: string, accessToken: string) {
  const res = await axios.get(`${API_BASE_URL}/google-blogger/blogs/${blogId}/posts/${postId}`, {
    params: { accessToken },
  })
  return res.data
}

// 전역 설정 관리 (통합된 Settings API)
export async function getGlobalSettings(): Promise<{ success: boolean; data: GlobalEngineSettings }> {
  const res = await axios.get(`${API_BASE_URL}/settings`)
  return res.data
}

export async function updateGlobalSettings(settings: Partial<GlobalEngineSettings>) {
  const res = await axios.put(`${API_BASE_URL}/settings`, settings)
  return res.data
}

// 개별 엔진 설정 업데이트를 위한 헬퍼 함수들
export async function updateGlobalGoogleSettings(settings: Partial<GlobalEngineSettings['google']>) {
  const currentSettings = await getGlobalSettings()
  const updatedSettings = {
    ...currentSettings.data,
    google: { ...currentSettings.data.google, ...settings },
  }
  return await updateGlobalSettings(updatedSettings)
}

export async function updateGlobalBingSettings(settings: Partial<GlobalEngineSettings['bing']>) {
  const currentSettings = await getGlobalSettings()
  const updatedSettings = {
    ...currentSettings.data,
    bing: { ...currentSettings.data.bing, ...settings },
  }
  return await updateGlobalSettings(updatedSettings)
}

export async function updateGlobalNaverSettings(settings: Partial<GlobalEngineSettings['naver']>) {
  const currentSettings = await getGlobalSettings()
  const updatedSettings = {
    ...currentSettings.data,
    naver: { ...currentSettings.data.naver, ...settings },
  }
  return await updateGlobalSettings(updatedSettings)
}

export async function updateGlobalDaumSettings(settings: Partial<GlobalEngineSettings['daum']>) {
  const currentSettings = await getGlobalSettings()
  const updatedSettings = {
    ...currentSettings.data,
    daum: { ...currentSettings.data.daum, ...settings },
  }
  return await updateGlobalSettings(updatedSettings)
}

// 네이버 로그인 관련
export interface NaverLoginStatus {
  isLoggedIn: boolean
  needsLogin: boolean
  message: string
}

export async function checkNaverLoginStatus(): Promise<NaverLoginStatus> {
  const res = await axios.get(`${API_BASE_URL}/naver-indexer/login-status`)
  return res.data
}

export async function openNaverLoginBrowser(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/open-login`)
  return res.data
}

export async function checkNaverLoginComplete(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/check-login-complete`)
  return res.data
}

export async function closeNaverLoginBrowser(): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/close-login-browser`)
  return res.data
}

export const manualIndexing = async (siteUrl: string, urls: string[], services: IndexProvider[], groupedUrls) => {
  // ... existing code ...
}

export const checkExistingUrls = async (
  urls: string[],
  providers: IndexProvider[],
): Promise<Record<IndexProvider, string[]>> => {
  const res = await axios.post(`${API_BASE_URL}/indexing/check-existing`, {
    urls,
    providers,
  })
  return res.data
}

export const getIndexingLogCount = async (siteUrl: string) => {
  const res = await axios.get(`${API_BASE_URL}/indexing-log/count?siteUrl=${siteUrl}`)
  return res.data
}

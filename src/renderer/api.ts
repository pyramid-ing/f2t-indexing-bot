import axios from 'axios'

const API_BASE_URL = 'http://localhost:3030'

// 사이트 설정 관련
export interface SiteConfig {
  siteUrl: string
  blogType: 'TISTORY' | 'BLOGGER' | 'WORDPRESS'
  indexingUrls: string[]
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
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/close-browser`)
  return res.data
}

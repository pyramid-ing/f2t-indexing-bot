import axios from 'axios'

const API_BASE_URL = 'http://localhost:3030'

// 사이트 설정 관련
export interface SiteConfig {
  siteUrl: string
  blogType: 'TISTORY' | 'BLOGGER' | 'WORDPRESS'
  indexingUrls: string[]
  bing?: {
    use: boolean
    apiKey?: string
  }
  google?: {
    use: boolean
    serviceAccountEmail?: string
    privateKey?: string
    oauth2ClientId?: string
    oauth2ClientSecret?: string
    oauth2AccessToken?: string
    oauth2RefreshToken?: string
    oauth2TokenExpiry?: Date
  }
  daum?: {
    use: boolean
    siteUrl?: string
    password?: string
  }
  naver?: {
    use: boolean
    naverId?: string
    password?: string
  }
}

// 앱 상태 관련
export async function getAppStatus() {
  const res = await axios.get(`${API_BASE_URL}/site-config/app-status`)
  return res.data
}

export async function markSetupCompleted() {
  const res = await axios.post(`${API_BASE_URL}/site-config/setup-completed`)
  return res.data
}

export async function reinitializeDatabase() {
  const res = await axios.post(`${API_BASE_URL}/site-config/reinitialize-database`)
  return res.data
}

// 사이트 설정 관리
export async function createSiteConfig(config: SiteConfig) {
  const res = await axios.post(`${API_BASE_URL}/site-config`, config)
  return res.data
}

export async function getSiteConfig(siteUrl: string) {
  const res = await axios.get(`${API_BASE_URL}/site-config/${encodeURIComponent(siteUrl)}`)
  return res.data
}

export async function updateSiteConfig(siteUrl: string, updates: Partial<SiteConfig>) {
  const res = await axios.put(`${API_BASE_URL}/site-config/${encodeURIComponent(siteUrl)}`, updates)
  return res.data
}

export async function deleteSiteConfig(siteUrl: string) {
  const res = await axios.delete(`${API_BASE_URL}/site-config/${encodeURIComponent(siteUrl)}`)
  return res.data
}

export async function getAllSiteConfigs() {
  const res = await axios.get(`${API_BASE_URL}/site-config`)
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

// Google OAuth 관련
export async function generateGoogleAuthUrl() {
  const res = await axios.get(`${API_BASE_URL}/google-oauth/auth-url`)
  return res.data
}

export async function exchangeGoogleAuthCode(code: string) {
  const res = await axios.post(`${API_BASE_URL}/google-oauth/exchange-code`, { code })
  return res.data
}

export async function getGoogleUserInfo(accessToken: string) {
  const res = await axios.get(`${API_BASE_URL}/google-oauth/user-info`, {
    params: { accessToken },
  })
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

// 전역 엔진 설정 관련 API
export async function getGlobalEngineSettings() {
  const res = await axios.get(`${API_BASE_URL}/site-config/global-engine-settings`)
  return res.data
}

export async function updateGlobalGoogleSettings(settings: {
  use: boolean
  serviceAccountEmail?: string
  privateKey?: string
  oauth2ClientId?: string
  oauth2ClientSecret?: string
  oauth2AccessToken?: string
  oauth2RefreshToken?: string
}) {
  const res = await axios.put(`${API_BASE_URL}/site-config/global-google-settings`, settings)
  return res.data
}

export async function updateGlobalBingSettings(settings: { use: boolean; apiKey?: string }) {
  const res = await axios.put(`${API_BASE_URL}/site-config/global-bing-settings`, settings)
  return res.data
}

export async function updateGlobalNaverSettings(settings: { use: boolean; naverId?: string; password?: string }) {
  const res = await axios.put(`${API_BASE_URL}/site-config/global-naver-settings`, settings)
  return res.data
}

export async function updateGlobalDaumSettings(settings: { use: boolean; siteUrl?: string; password?: string }) {
  const res = await axios.put(`${API_BASE_URL}/site-config/global-daum-settings`, settings)
  return res.data
}

import { getGoogleOAuthStatus, googleOAuthLogout } from '../api'

// OAuth2 설정
const GOOGLE_REDIRECT_URI = 'http://localhost:3030/google-oauth/callback'
const GOOGLE_SCOPE = [
  'https://www.googleapis.com/auth/blogger',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

// OAuth2 인증 URL 생성
export function generateGoogleAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    scope: GOOGLE_SCOPE,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// 서버에서 Google OAuth 상태 확인
export async function getGoogleAuthStatus() {
  try {
    const response = await getGoogleOAuthStatus()
    return response
  }
  catch (error) {
    console.error('Google OAuth 상태 확인 오류:', error)
    return {
      isLoggedIn: false,
      message: '상태 확인 실패',
      error: error.message,
    }
  }
}

// 서버에서 Google OAuth 로그아웃
export async function logoutGoogle() {
  try {
    const response = await googleOAuthLogout()
    return response
  }
  catch (error) {
    console.error('Google OAuth 로그아웃 오류:', error)
    throw error
  }
}

// 로그인 상태 확인 (서버 기반)
export async function isGoogleLoggedIn(): Promise<boolean> {
  try {
    const status = await getGoogleAuthStatus()
    return status.isLoggedIn || false
  }
  catch (error) {
    return false
  }
}

// 사용자 정보 가져오기 (서버에서 저장된 토큰 사용)
export async function getGoogleUserInfo(): Promise<any> {
  try {
    const status = await getGoogleAuthStatus()
    if (status.isLoggedIn && status.userInfo) {
      return status.userInfo
    }
    throw new Error('로그인되지 않았거나 사용자 정보가 없습니다.')
  }
  catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    throw error
  }
}

// 로그인 프로세스 시작 (브라우저에서 OAuth 진행)
export function startGoogleLogin(clientId: string) {
  if (!clientId.trim()) {
    throw new Error('OAuth2 Client ID가 필요합니다.')
  }

  const authUrl = generateGoogleAuthUrl(clientId)

  // Electron에서 외부 브라우저로 열기
  if ((window as any).electron?.shell?.openExternal) {
    ;(window as any).electron.shell.openExternal(authUrl)
  }
  else {
    window.open(authUrl, '_blank')
  }

  return {
    success: true,
    message: '브라우저에서 Google 로그인을 완료하세요. 인증이 완료되면 자동으로 처리됩니다.',
  }
}

// 레거시 함수들 (하위 호환성을 위해 유지하되 서버 API 사용)
export function loadGoogleTokens(): GoogleTokens | null {
  // 더 이상 localStorage를 사용하지 않음
  console.warn('loadGoogleTokens는 더 이상 사용되지 않습니다. getGoogleAuthStatus()를 사용하세요.')
  return null
}

export function saveGoogleTokens(tokens: GoogleTokens): void {
  // 더 이상 localStorage를 사용하지 않음
  console.warn('saveGoogleTokens는 더 이상 사용되지 않습니다. 서버에서 자동으로 처리됩니다.')
}

export function clearGoogleTokens(): void {
  // 더 이상 localStorage를 사용하지 않음
  console.warn('clearGoogleTokens는 더 이상 사용되지 않습니다. logoutGoogle()을 사용하세요.')
}

// 유효한 Access Token 가져오기 (서버에서 자동 갱신)
export async function getValidAccessToken(): Promise<string | null> {
  try {
    const status = await getGoogleAuthStatus()
    if (status.isLoggedIn) {
      // 서버에서 자동으로 토큰 갱신을 처리하므로 별도 처리 불필요
      return 'valid' // 실제 토큰 값은 서버에서 관리
    }
    return null
  }
  catch (error) {
    console.error('토큰 확인 실패:', error)
    return null
  }
}

// 사용되지 않는 함수들 (레거시 지원)
export async function exchangeCodeForTokens(): Promise<GoogleTokens> {
  throw new Error('exchangeCodeForTokens는 더 이상 사용되지 않습니다. 서버에서 자동으로 처리됩니다.')
}

export async function refreshAccessToken(): Promise<GoogleTokens> {
  throw new Error('refreshAccessToken는 더 이상 사용되지 않습니다. 서버에서 자동으로 처리됩니다.')
}

import { message } from 'antd'

// OAuth2 설정
const GOOGLE_CLIENT_ID = '788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com'
const GOOGLE_REDIRECT_URI = 'http://localhost:3030/google-oauth/callback'
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/blogger'

export interface GoogleTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

// OAuth2 인증 URL 생성
export const generateGoogleAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    scope: GOOGLE_SCOPE,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Authorization Code를 Access Token으로 교환
export const exchangeCodeForTokens = async (code: string, clientSecret: string): Promise<GoogleTokens> => {
  try {
    console.log('OAuth 토큰 교환 시작:', {
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      code_length: code.length,
      client_secret_length: clientSecret.length,
    })

    const requestBody = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    })

    console.log('요청 Body:', requestBody.toString())

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
    })

    console.log('응답 상태:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OAuth 에러 응답:', errorData)
      
      let errorMessage = '토큰 교환 실패'
      if (errorData.error === 'invalid_client') {
        errorMessage = 'Client ID 또는 Client Secret이 잘못되었습니다.'
      } else if (errorData.error === 'invalid_grant') {
        errorMessage = '인증 코드가 잘못되었거나 만료되었습니다.'
      } else if (errorData.error === 'redirect_uri_mismatch') {
        errorMessage = 'Redirect URI가 일치하지 않습니다.'
      } else if (errorData.error_description) {
        errorMessage = errorData.error_description
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log('토큰 교환 성공:', { access_token_length: data.access_token?.length })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  } catch (error) {
    console.error('Token 교환 오류:', error)
    throw error
  }
}

// Refresh Token으로 Access Token 갱신
export const refreshAccessToken = async (refreshToken: string, clientSecret: string): Promise<GoogleTokens> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error_description || 'Token 갱신 실패')
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken, // refresh token은 유지
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  } catch (error) {
    console.error('Token 갱신 오류:', error)
    throw error
  }
}

// 토큰 저장
export const saveGoogleTokens = (tokens: GoogleTokens): void => {
  localStorage.setItem('google_tokens', JSON.stringify(tokens))
}

// 토큰 로드
export const loadGoogleTokens = (): GoogleTokens | null => {
  const stored = localStorage.getItem('google_tokens')
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// 토큰 삭제
export const clearGoogleTokens = (): void => {
  localStorage.removeItem('google_tokens')
}

// 유효한 Access Token 가져오기 (필요시 갱신)
export const getValidAccessToken = async (clientSecret: string): Promise<string | null> => {
  const tokens = loadGoogleTokens()
  if (!tokens) return null

  // 토큰이 만료되지 않았으면 그대로 반환
  if (Date.now() < tokens.expiresAt - 60000) {
    // 1분 여유
    return tokens.accessToken
  }

  // 토큰이 만료되었으면 갱신 시도
  if (tokens.refreshToken) {
    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken, clientSecret)
      saveGoogleTokens(newTokens)
      return newTokens.accessToken
    } catch (error) {
      console.error('토큰 갱신 실패:', error)
      clearGoogleTokens()
      message.error('Google 토큰이 만료되었습니다. 다시 로그인해주세요.')
      return null
    }
  }

  clearGoogleTokens()
  return null
}

// 로그인 상태 확인
export const isGoogleLoggedIn = (): boolean => {
  const tokens = loadGoogleTokens()
  return tokens !== null
}

// Google 사용자 정보 가져오기
export const getGoogleUserInfo = async (accessToken: string): Promise<any> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('사용자 정보 조회 실패')
    }

    return await response.json()
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    throw error
  }
}

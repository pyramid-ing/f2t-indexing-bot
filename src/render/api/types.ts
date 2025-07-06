export const API_BASE_URL = 'http://localhost:3553'

export type IndexProvider = 'GOOGLE' | 'BING' | 'NAVER' | 'DAUM'

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

    if (errorData.code && errorData.service && errorData.operation) {
      return `[${errorData.service}/${errorData.operation}] ${errorData.message}`
    }

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

export interface Site {
  id: string
  domain: string
  name: string
  siteUrl: string
  isActive: boolean
  googleConfig: Record<string, any>
  naverConfig: Record<string, any>
  daumConfig: Record<string, any>
  bingConfig: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface SiteConfig extends Site {
  // SiteConfig는 Site와 동일한 구조를 가지지만,
  // 필요한 경우 추가 필드를 확장할 수 있습니다.
}

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

export interface NaverLoginStatus {
  isLoggedIn: boolean
  needsLogin: boolean
  message: string
}

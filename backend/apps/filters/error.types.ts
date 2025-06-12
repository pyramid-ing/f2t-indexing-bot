export class QuizCrawlingError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly category?: string,
  ) {
    super(message)
    this.name = 'QuizCrawlingError'
  }
}

export class BlogPostError extends Error {
  constructor(
    message: string,
    public readonly category?: string,
    public readonly postData?: any,
  ) {
    super(message)
    this.name = 'BlogPostError'
  }
}

export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public readonly ffmpegError?: string,
    public readonly inputData?: any,
  ) {
    super(message)
    this.name = 'VideoGenerationError'
  }
}

// 정규화된 에러 클래스들
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

  // 일반 에러들
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode
  service: string
  operation: string
  url?: string
  siteUrl?: string
  additionalInfo?: Record<string, any>
}

// 정규화된 기본 에러 클래스
export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly service: string
  public readonly operation: string
  public readonly details: ErrorDetails

  constructor(
    code: ErrorCode,
    message: string,
    service: string,
    operation: string,
    additionalInfo?: Record<string, any>,
  ) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.service = service
    this.operation = operation
    this.details = {
      code,
      service,
      operation,
      additionalInfo,
    }
  }
}

// Google 특화 에러 클래스들
export class GoogleAuthError extends ServiceError {
  constructor(message: string, operation: string, additionalInfo?: Record<string, any>) {
    super(ErrorCode.GOOGLE_AUTH_FAILED, message, 'Google', operation, additionalInfo)
    this.name = 'GoogleAuthError'
  }
}

export class GoogleTokenError extends ServiceError {
  constructor(message: string, operation: string, isExpired: boolean = false, additionalInfo?: Record<string, any>) {
    const code = isExpired ? ErrorCode.GOOGLE_TOKEN_EXPIRED : ErrorCode.GOOGLE_TOKEN_INVALID
    super(code, message, 'Google', operation, { isExpired, ...additionalInfo })
    this.name = 'GoogleTokenError'
  }
}

export class GoogleIndexerError extends ServiceError {
  constructor(
    message: string,
    operation: string,
    url?: string,
    siteUrl?: string,
    additionalInfo?: Record<string, any>,
  ) {
    super(ErrorCode.GOOGLE_INDEXER_FAILED, message, 'Google Indexer', operation, { url, siteUrl, ...additionalInfo })
    this.name = 'GoogleIndexerError'
    this.details.url = url
    this.details.siteUrl = siteUrl
  }
}

export class GoogleBloggerError extends ServiceError {
  constructor(
    message: string,
    operation: string,
    blogId?: string,
    postId?: string,
    additionalInfo?: Record<string, any>,
  ) {
    super(ErrorCode.GOOGLE_BLOGGER_API_FAILED, message, 'Google Blogger', operation, {
      blogId,
      postId,
      ...additionalInfo,
    })
    this.name = 'GoogleBloggerError'
  }
}

export class GoogleConfigError extends ServiceError {
  constructor(message: string, operation: string, configType: string, additionalInfo?: Record<string, any>) {
    super(ErrorCode.GOOGLE_OAUTH_CONFIG_MISSING, message, 'Google Config', operation, { configType, ...additionalInfo })
    this.name = 'GoogleConfigError'
  }
}

// 에러 응답 타입 정의 (업데이트됨)
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

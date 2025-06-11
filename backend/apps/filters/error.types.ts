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

// 에러 응답 타입 정의
export interface ErrorResponse {
  success: false
  statusCode: number
  timestamp: string
  path: string
  error: string
  message: string
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
  }
}

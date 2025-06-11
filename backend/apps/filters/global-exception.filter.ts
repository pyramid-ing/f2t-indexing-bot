import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { AxiosError } from 'axios'
import { BlogPostError, QuizCrawlingError, VideoGenerationError, ErrorResponse } from './error.types'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let error = 'Unknown Error'
    let details = null

    if (exception instanceof QuizCrawlingError) {
      statusCode = HttpStatus.BAD_GATEWAY
      message = exception.message
      error = exception.name
      details = {
        url: exception.url,
        category: exception.category,
        stack: this.formatStackTrace(exception.stack),
      }
    } else if (exception instanceof BlogPostError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR
      message = exception.message
      error = exception.name
      details = {
        category: exception.category,
        postData: exception.postData,
        stack: this.formatStackTrace(exception.stack),
      }
    } else if (exception instanceof VideoGenerationError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR
      message = exception.message
      error = exception.name
      details = {
        ffmpegError: exception.ffmpegError,
        inputData: exception.inputData,
        stack: this.formatStackTrace(exception.stack),
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const response = exception.getResponse()
      if (typeof response === 'object') {
        message = (response as any).message || message
        error = (response as any).error || error
      } else {
        message = response
      }
    } else if (exception instanceof AxiosError) {
      statusCode = exception.response?.status || HttpStatus.BAD_GATEWAY
      message = this.getAxiosErrorMessage(exception)
      error = 'External API Error'
      details = {
        url: exception.config?.url,
        method: exception.config?.method?.toUpperCase(),
        response: exception.response?.data,
        code: exception.code,
      }
    } else if (exception instanceof Error) {
      message = exception.message
      error = exception.name
      details = {
        stack: this.formatStackTrace(exception.stack),
        name: exception.name,
      }
    }

    const responseBody: ErrorResponse = {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      error,
      message,
      details,
    }

    // 에러 로깅
    this.logger.error({
      message: `[${error}] ${message}`,
      path: responseBody.path,
      details: responseBody.details,
      stack: exception instanceof Error ? exception.stack : undefined,
    })

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode)
  }

  private getAxiosErrorMessage(error: AxiosError): string {
    if (error.response) {
      // 서버가 2xx 범위를 벗어난 상태 코드로 응답한 경우
      return `External API responded with status ${error.response.status}: ${error.message}`
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못한 경우
      return 'No response received from external API'
    } else {
      // 요청 설정 중에 문제가 발생한 경우
      return `Error setting up the request: ${error.message}`
    }
  }

  private formatStackTrace(stack: string | undefined): string[] | undefined {
    if (!stack) return undefined

    return stack
      .split('\n')
      .slice(1) // 첫 번째 줄(에러 메시지) 제외
      .map(line => line.trim())
      .filter(line => !line.includes('node_modules')) // node_modules 경로 제외
      .map(line => {
        // 파일 경로에서 프로젝트 루트 기준 상대 경로만 표시
        const match = line.match(/\((.+)\)/)
        if (match) {
          const path = match[1]
          const projectPath = path.split('/lucky-quiz/').pop()
          return projectPath ? `at ${projectPath}` : line
        }
        return line
      })
  }
}

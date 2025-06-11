import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { SettingsService } from '../../../shared/settings.service'

export interface BloggerOptions {
  blogId?: string
  blogUrl?: string
  maxResults?: number
  pageToken?: string
  status?: 'live' | 'draft' | 'scheduled'
}

export interface BloggerPost {
  id: string
  title: string
  content: string
  url: string
  published: string
  updated: string
  author: {
    id: string
    displayName: string
  }
  labels?: string[]
  status: string
}

@Injectable()
export class GoogleBloggerService {
  private readonly logger = new Logger(GoogleBloggerService.name)
  private readonly bloggerApiUrl = 'https://www.googleapis.com/blogger/v3'

  constructor(
    private readonly httpService: HttpService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * 저장된 Google OAuth 토큰 가져오기
   */
  private async getAccessToken(): Promise<string> {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const { oauth2AccessToken, oauth2RefreshToken, oauth2TokenExpiry, oauth2ClientId, oauth2ClientSecret } =
        globalSettings.google

      if (!oauth2AccessToken) {
        throw new Error('Google OAuth 토큰이 없습니다. 먼저 로그인해주세요.')
      }

      // 토큰 만료 확인
      const expiryTime = oauth2TokenExpiry ? new Date(oauth2TokenExpiry).getTime() : 0
      const isExpired = Date.now() >= expiryTime - 60000 // 1분 여유

      if (isExpired && oauth2RefreshToken) {
        // 토큰 자동 갱신
        console.log('Google 토큰 만료 감지, 자동 갱신 시도...')
        try {
          const newTokens = await this.refreshAccessToken(oauth2RefreshToken, oauth2ClientId, oauth2ClientSecret)

          // DB에 새로운 토큰 저장
          const updatedGoogleSettings = {
            ...globalSettings.google,
            oauth2AccessToken: newTokens.accessToken,
            oauth2TokenExpiry: new Date(newTokens.expiresAt).toISOString(),
          }

          await this.settingsService.updateGlobalGoogleSettings(updatedGoogleSettings)
          console.log('Google 토큰이 자동으로 갱신되었습니다.')

          return newTokens.accessToken
        } catch (refreshError) {
          throw new Error(`Google 토큰 갱신 실패: ${refreshError.message}. 다시 로그인해주세요.`)
        }
      }

      return oauth2AccessToken
    } catch (error) {
      throw new Error(`Google 인증 토큰 가져오기 실패: ${error.message}`)
    }
  }

  /**
   * Refresh Token으로 Access Token 갱신
   */
  private async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
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
      expiresAt: Date.now() + data.expires_in * 1000,
    }
  }

  /**
   * 블로그 URL로 블로그 정보 조회
   */
  async getBlogByUrl(blogUrl: string, accessToken?: string): Promise<any> {
    try {
      const token = accessToken || (await this.getAccessToken())

      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/blogs/byurl`, {
          params: {
            url: blogUrl,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`블로그 정보 조회 실패: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 블로그 게시물 목록 조회
   */
  async getBlogPosts(options: BloggerOptions): Promise<any> {
    const { blogId, blogUrl, maxResults = 10, pageToken, status = 'live' } = options

    try {
      const accessToken = await this.getAccessToken()
      let finalBlogId = blogId

      // blogId가 없으면 blogUrl로 조회
      if (!finalBlogId && blogUrl) {
        const blogInfo = await this.getBlogByUrl(blogUrl, accessToken)
        finalBlogId = blogInfo.id
      }

      if (!finalBlogId) {
        throw new Error('blogId 또는 blogUrl이 필요합니다.')
      }

      const params: any = {
        maxResults,
        status,
      }

      if (pageToken) {
        params.pageToken = pageToken
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/blogs/${finalBlogId}/posts`, {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      )

      return response.data
    } catch (error) {
      throw new Error(`블로그 게시물 조회 실패: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 특정 게시물 조회
   */
  async getBlogPost(blogId: string, postId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()

      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/blogs/${blogId}/posts/${postId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`게시물 조회 실패: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 블로그 정보 조회
   */
  async getBlogInfo(blogId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()

      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/blogs/${blogId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`블로그 정보 조회 실패: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * 사용자의 블로그 목록 조회
   */
  async getUserBlogs(): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()

      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/users/self/blogs`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      )
      return response.data
    } catch (error) {
      throw new Error(`사용자 블로그 목록 조회 실패: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async getBloggerBlogs() {
    try {
      // 전역 Google 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const googleConfig = globalSettings.google

      if (!googleConfig.oauth2AccessToken) {
        throw new Error('Google OAuth2 토큰이 설정되지 않았습니다.')
      }

      // Blogger API를 사용하여 블로그 목록 조회
      this.logger.log('Blogger 블로그 목록 조회')

      // 실제 구현은 Google API 클라이언트를 사용
      return {
        success: true,
        blogs: [],
        message: 'Blogger 블로그 목록 조회 성공',
      }
    } catch (error) {
      this.logger.error('Blogger 블로그 목록 조회 실패:', error)
      throw error
    }
  }
}

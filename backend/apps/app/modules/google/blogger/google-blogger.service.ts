import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'

export interface BloggerOptions {
  blogId?: string
  blogUrl?: string
  accessToken: string
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
  private readonly bloggerApiUrl = 'https://www.googleapis.com/blogger/v3'

  constructor(private readonly httpService: HttpService) {}

  /**
   * 블로그 URL로 블로그 정보 조회
   */
  async getBlogByUrl(blogUrl: string, accessToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.bloggerApiUrl}/blogs/byurl`, {
          params: {
            url: blogUrl,
          },
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
   * 블로그 게시물 목록 조회
   */
  async getBlogPosts(options: BloggerOptions): Promise<any> {
    const { blogId, blogUrl, accessToken, maxResults = 10, pageToken, status = 'live' } = options

    try {
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
  async getBlogPost(blogId: string, postId: string, accessToken: string): Promise<any> {
    try {
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
  async getBlogInfo(blogId: string, accessToken: string): Promise<any> {
    try {
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
  async getUserBlogs(accessToken: string): Promise<any> {
    try {
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
}

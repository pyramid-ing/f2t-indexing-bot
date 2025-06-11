import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { GoogleBloggerService, BloggerOptions } from './google-blogger.service'

@Controller('google-blogger')
export class GoogleBloggerController {
  constructor(private readonly googleBloggerService: GoogleBloggerService) {}

  /**
   * 블로그 게시물 목록 조회
   */
  @Post('posts')
  async getBlogPosts(@Body() body: BloggerOptions): Promise<any> {
    const posts = await this.googleBloggerService.getBlogPosts(body)
    return { posts }
  }

  /**
   * 특정 게시물 조회
   */
  @Get('blogs/:blogId/posts/:postId')
  async getBlogPost(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<any> {
    if (!accessToken) {
      throw new Error('accessToken이 필요합니다.')
    }

    const post = await this.googleBloggerService.getBlogPost(blogId, postId, accessToken)
    return { post }
  }

  /**
   * 블로그 정보 조회
   */
  @Get('blogs/:blogId')
  async getBlogInfo(@Param('blogId') blogId: string, @Query('accessToken') accessToken: string): Promise<any> {
    if (!accessToken) {
      throw new Error('accessToken이 필요합니다.')
    }

    const blog = await this.googleBloggerService.getBlogInfo(blogId, accessToken)
    return { blog }
  }

  /**
   * 블로그 URL로 블로그 정보 조회
   */
  @Post('blogs/by-url')
  async getBlogByUrl(@Body() body: { blogUrl: string; accessToken: string }): Promise<any> {
    const { blogUrl, accessToken } = body

    if (!blogUrl || !accessToken) {
      throw new Error('blogUrl과 accessToken이 필요합니다.')
    }

    const blog = await this.googleBloggerService.getBlogByUrl(blogUrl, accessToken)
    return { blog }
  }

  /**
   * 사용자의 블로그 목록 조회
   */
  @Get('user/blogs')
  async getUserBlogs(@Query('accessToken') accessToken: string): Promise<any> {
    if (!accessToken) {
      throw new Error('accessToken이 필요합니다.')
    }

    const blogs = await this.googleBloggerService.getUserBlogs(accessToken)
    return { blogs }
  }
}

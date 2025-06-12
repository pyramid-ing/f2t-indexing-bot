import { Body, Controller, Post, Get } from '@nestjs/common'
import { NaverIndexerService, NaverIndexerOptions } from './naver-indexer.service'

@Controller('naver-indexer')
export class NaverIndexerController {
  constructor(private readonly naverIndexerService: NaverIndexerService) {}

  @Post('manual-index')
  async manualIndex(@Body() body: NaverIndexerOptions & { headless?: boolean }) {
    const results = await this.naverIndexerService.manualIndexing(body, body.headless)
    return { results }
  }

  @Get('login-status')
  async checkLoginStatus() {
    return await this.naverIndexerService.checkLoginStatus()
  }

  @Post('open-login')
  async openLoginBrowser() {
    return await this.naverIndexerService.openLoginBrowser()
  }

  @Post('check-login-complete')
  async checkLoginComplete() {
    return await this.naverIndexerService.checkLoginComplete()
  }

  @Post('close-browser')
  async closeBrowser() {
    await this.naverIndexerService.closeBrowser()
    return { success: true, message: '브라우저를 닫았습니다.' }
  }
}

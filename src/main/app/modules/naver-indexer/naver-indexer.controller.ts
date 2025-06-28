import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { NaverIndexerOptions, NaverIndexerService } from 'src/main/app/modules/naver-indexer/naver-indexer.service'

@Controller('naver-indexer')
export class NaverIndexerController {
  constructor(private readonly naverIndexerService: NaverIndexerService) {}

  @Post('manual')
  async manualIndex(@Body() body: NaverIndexerOptions & { headless?: boolean }) {
    const results = await this.naverIndexerService.manualIndexing(body, body.headless)
    return { results }
  }

  @Get('login-status')
  async checkLoginStatus(@Query('naverId') naverId?: string) {
    return await this.naverIndexerService.checkLoginStatus(naverId)
  }

  @Post('open-login')
  async openLoginBrowser(@Body() body?: { naverId?: string }) {
    return await this.naverIndexerService.openLoginBrowser(body?.naverId)
  }

  @Post('check-login-complete')
  async checkLoginComplete(@Body() body?: { naverId?: string }) {
    return await this.naverIndexerService.checkLoginComplete(body?.naverId)
  }

  @Post('close-browser')
  async closeBrowser() {
    await this.naverIndexerService.closeBrowser()
    return { success: true, message: '브라우저를 닫았습니다.' }
  }
}

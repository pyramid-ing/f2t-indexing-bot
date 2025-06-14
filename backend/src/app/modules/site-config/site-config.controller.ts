import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common'
import { SiteConfigService } from './site-config.service'

@Controller('sites')
export class SiteConfigController {
  private readonly logger = new Logger(SiteConfigController.name)

  constructor(private readonly siteConfigService: SiteConfigService) {}

  // 기본 사이트 관리 API만 유지
  @Get()
  async getAllSites() {
    try {
      const sites = await this.siteConfigService.getAllSiteConfigs()
      return { success: true, data: sites }
    } catch (error) {
      this.logger.error('사이트 목록 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Post()
  async createSite(@Body() siteData: any) {
    try {
      const site = await this.siteConfigService.createSiteConfig(siteData)
      return { success: true, data: site }
    } catch (error) {
      this.logger.error('사이트 생성 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Put(':siteUrl')
  async updateSite(@Param('siteUrl') siteUrl: string, @Body() updateData: any) {
    try {
      const site = await this.siteConfigService.updateSiteConfig(decodeURIComponent(siteUrl), updateData)
      return { success: true, data: site }
    } catch (error) {
      this.logger.error('사이트 업데이트 실패:', error)
      return { success: false, error: error.message }
    }
  }

  @Delete(':siteUrl')
  async deleteSite(@Param('siteUrl') siteUrl: string) {
    try {
      const result = await this.siteConfigService.deleteSiteConfig(decodeURIComponent(siteUrl))
      return { success: true, message: result.message }
    } catch (error) {
      this.logger.error('사이트 삭제 실패:', error)
      return { success: false, error: error.message }
    }
  }
}

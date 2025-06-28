import type { EngineConfig } from 'src/main/app/modules/site-config/site-config.service'
import { Body, Controller, Delete, Get, Logger, Param, Post, Put } from '@nestjs/common'
import { SiteConfigService } from 'src/main/app/modules/site-config/site-config.service'

@Controller('sites')
export class SiteConfigController {
  private readonly logger = new Logger(SiteConfigController.name)

  constructor(private readonly siteConfigService: SiteConfigService) {}

  // 모든 사이트 조회
  @Get()
  async getAllSites() {
    try {
      const sites = await this.siteConfigService.getAllSiteConfigs()
      return { success: true, data: sites }
    }
    catch (error) {
      this.logger.error('사이트 목록 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 활성화된 사이트만 조회
  @Get('active')
  async getActiveSites() {
    try {
      const sites = await this.siteConfigService.getActiveSites()
      return { success: true, data: sites }
    }
    catch (error) {
      this.logger.error('활성 사이트 목록 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 특정 사이트 조회 (ID 기반)
  @Get(':siteId')
  async getSite(@Param('siteId') siteId: string) {
    try {
      const site = await this.siteConfigService.getSiteConfig(Number.parseInt(siteId))
      return { success: true, data: site }
    }
    catch (error) {
      this.logger.error('사이트 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 도메인으로 사이트 조회
  @Get('domain/:domain')
  async getSiteByDomain(@Param('domain') domain: string) {
    try {
      const site = await this.siteConfigService.getSiteConfigByDomain(decodeURIComponent(domain))
      return { success: true, data: site }
    }
    catch (error) {
      this.logger.error('도메인별 사이트 조회 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 새 사이트 생성
  @Post()
  async createSite(@Body() siteData: any) {
    try {
      const site = await this.siteConfigService.createSiteConfig(siteData)
      return { success: true, data: site }
    }
    catch (error) {
      this.logger.error('사이트 생성 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 사이트 기본 정보 업데이트
  @Put(':siteId')
  async updateSite(@Param('siteId') siteId: string, @Body() updateData: any) {
    try {
      const site = await this.siteConfigService.updateSiteConfig(Number.parseInt(siteId), updateData)
      return { success: true, data: site }
    }
    catch (error) {
      this.logger.error('사이트 업데이트 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 검색엔진별 설정 업데이트
  @Put(':siteId/engines')
  async updateSiteEngineConfigs(@Param('siteId') siteId: string, @Body() configs: EngineConfig) {
    try {
      const site = await this.siteConfigService.updateSiteEngineConfigs(Number.parseInt(siteId), configs)
      return { success: true, data: site }
    }
    catch (error) {
      this.logger.error('사이트 검색엔진 설정 업데이트 실패:', error)
      return { success: false, error: error.message }
    }
  }

  // 사이트 삭제
  @Delete(':siteId')
  async deleteSite(@Param('siteId') siteId: string) {
    try {
      const result = await this.siteConfigService.deleteSiteConfig(Number.parseInt(siteId))
      return { success: true, message: result.message }
    }
    catch (error) {
      this.logger.error('사이트 삭제 실패:', error)
      return { success: false, error: error.message }
    }
  }
}

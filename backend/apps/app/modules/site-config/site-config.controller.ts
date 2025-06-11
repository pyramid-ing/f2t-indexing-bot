import { Body, Controller, Delete, Get, Param, Post, Put, HttpCode } from '@nestjs/common'
import { SiteConfigService, SiteConfigData } from './site-config.service'
import { DatabaseInitService } from '@prd/apps/app/shared/database-init.service'

@Controller('site-config')
export class SiteConfigController {
  constructor(
    private readonly siteConfigService: SiteConfigService,
    private readonly databaseInitService: DatabaseInitService,
  ) {}

  @Post()
  async createSiteConfig(@Body() data: SiteConfigData) {
    const site = await this.siteConfigService.createSiteConfig(data)
    return {
      message: '사이트 설정이 생성되었습니다.',
      site,
    }
  }

  @Get()
  async getAllSiteConfigs() {
    const sites = await this.siteConfigService.getAllSiteConfigs()
    return { sites }
  }

  @Get(':siteUrl')
  async getSiteConfig(@Param('siteUrl') siteUrl: string) {
    const site = await this.siteConfigService.getSiteConfig(decodeURIComponent(siteUrl))
    return { site }
  }

  @Put(':siteUrl')
  async updateSiteConfig(@Param('siteUrl') siteUrl: string, @Body() updates: Partial<SiteConfigData>) {
    const site = await this.siteConfigService.updateSiteConfig(decodeURIComponent(siteUrl), updates)
    return {
      message: '사이트 설정이 업데이트되었습니다.',
      site,
    }
  }

  @Delete(':siteUrl')
  async deleteSiteConfig(@Param('siteUrl') siteUrl: string) {
    const result = await this.siteConfigService.deleteSiteConfig(decodeURIComponent(siteUrl))
    return result
  }

  // 특정 서비스별 설정 업데이트 엔드포인트들
  @Put(':siteUrl/bing')
  async updateBingConfig(@Param('siteUrl') siteUrl: string, @Body() config: { use: boolean; apiKey?: string }) {
    const site = await this.siteConfigService.updateBingConfig(decodeURIComponent(siteUrl), config)
    return {
      message: 'Bing 설정이 업데이트되었습니다.',
      site,
    }
  }

  @Put(':siteUrl/google')
  async updateGoogleConfig(
    @Param('siteUrl') siteUrl: string,
    @Body()
    config: {
      use: boolean
      serviceAccountEmail?: string
      privateKey?: string
      oauth2ClientId?: string
      oauth2ClientSecret?: string
      oauth2AccessToken?: string
      oauth2RefreshToken?: string
      oauth2TokenExpiry?: string // ISO string으로 받아서 Date로 변환
    },
  ) {
    const processedConfig = {
      ...config,
      oauth2TokenExpiry: config.oauth2TokenExpiry ? new Date(config.oauth2TokenExpiry) : undefined,
    }

    const site = await this.siteConfigService.updateGoogleConfig(decodeURIComponent(siteUrl), processedConfig)
    return {
      message: 'Google 설정이 업데이트되었습니다.',
      site,
    }
  }

  @Put(':siteUrl/daum')
  async updateDaumConfig(
    @Param('siteUrl') siteUrl: string,
    @Body() config: { use: boolean; siteUrl?: string; password?: string },
  ) {
    const site = await this.siteConfigService.updateDaumConfig(decodeURIComponent(siteUrl), config)
    return {
      message: 'Daum 설정이 업데이트되었습니다.',
      site,
    }
  }

  @Put(':siteUrl/naver')
  async updateNaverConfig(
    @Param('siteUrl') siteUrl: string,
    @Body() config: { use: boolean; naverId?: string; password?: string },
  ) {
    const site = await this.siteConfigService.updateNaverConfig(decodeURIComponent(siteUrl), config)
    return {
      message: 'Naver 설정이 업데이트되었습니다.',
      site,
    }
  }

  // 앱 상태 확인
  @Get('app-status')
  async getAppStatus() {
    return await this.databaseInitService.getAppStatus()
  }

  // 초기 설정 완료 표시
  @Post('setup-completed')
  @HttpCode(200)
  async markSetupCompleted() {
    await this.databaseInitService.markSetupCompleted()
    return { success: true, message: '초기 설정이 완료되었습니다.' }
  }

  // DB 재초기화 (관리자 기능)
  @Post('reinitialize-database')
  @HttpCode(200)
  async reinitializeDatabase() {
    await this.databaseInitService.reinitializeDatabase()
    return { success: true, message: '데이터베이스가 재초기화되었습니다.' }
  }
}

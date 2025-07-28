import { SettingsService } from '@main/app/modules/settings/settings.service'
import { Body, Controller, Get, Logger, Put } from '@nestjs/common'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'

@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getGlobalEngineSettings()
    return { success: true, data: settings }
  }

  @Put()
  async updateSettings(@Body() updateData: any) {
    this.logger.log('설정 업데이트 요청:', updateData)

    const currentSettings = await this.settingsService.getGlobalEngineSettings()
    const updatedSettings = { ...currentSettings, ...updateData }

    await (this.prisma as any).settings.upsert({
      where: { id: 2 },
      create: {
        id: 2,
        data: JSON.stringify(updatedSettings),
      },
      update: {
        data: JSON.stringify(updatedSettings),
      },
    })

    this.logger.log('설정 업데이트 완료')
    return { success: true, data: updatedSettings }
  }

  @Get('status')
  async getAppStatus() {
    this.logger.log('앱 상태 조회 요청')
    const status = await this.settingsService.getAppStatus()
    return { success: true, data: status }
  }

  @Put('ai')
  async updateAiSettings(@Body() settings: any) {
    this.logger.log('AI 설정 업데이트 요청:', settings)
    await this.settingsService.updateGlobalAiSettings(settings)
    return { success: true, message: 'AI 설정이 업데이트되었습니다.' }
  }
}

import { Module } from '@nestjs/common'
import { SettingsController } from 'src/main/app/modules/settings/settings.controller'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { CommonModule } from '@main/app/modules/common/common.module'

@Module({
  imports: [CommonModule],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}

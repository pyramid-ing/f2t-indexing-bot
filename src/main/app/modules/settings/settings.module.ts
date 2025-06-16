import { Module } from '@nestjs/common'
import { SettingsController } from 'src/main/app/modules/settings/settings.controller'
import { PrismaService } from 'src/main/app/shared/prisma.service'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Module({
  providers: [PrismaService, SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}

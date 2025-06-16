import { Module } from '@nestjs/common'
import { SiteConfigController } from 'src/main/app/modules/site-config/site-config.controller'
import { SiteConfigService } from 'src/main/app/modules/site-config/site-config.service'
import { PrismaService } from 'src/main/app/shared/prisma.service'

@Module({
  providers: [SiteConfigService, PrismaService],
  controllers: [SiteConfigController],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}

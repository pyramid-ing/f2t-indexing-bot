import { Module } from '@nestjs/common'
import { SiteConfigService } from './site-config.service'
import { SiteConfigController } from './site-config.controller'
import { PrismaService } from '../../shared/prisma.service'

@Module({
  providers: [SiteConfigService, PrismaService],
  controllers: [SiteConfigController],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}

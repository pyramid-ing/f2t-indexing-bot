import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GoogleBloggerService } from './google-blogger.service'
import { GoogleBloggerController } from './google-blogger.controller'
import { PrismaService } from '../../../shared/prisma.service'
import { SettingsService } from '../../../shared/settings.service'

@Module({
  imports: [HttpModule],
  providers: [GoogleBloggerService, PrismaService, SettingsService],
  controllers: [GoogleBloggerController],
  exports: [GoogleBloggerService],
})
export class GoogleBloggerModule {}

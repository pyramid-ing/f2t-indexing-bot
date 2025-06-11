import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GoogleBloggerService } from './google-blogger.service'
import { GoogleBloggerController } from './google-blogger.controller'
import { DatabaseInitService } from '@prd/apps/app/shared/database-init.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  imports: [HttpModule],
  providers: [GoogleBloggerService, DatabaseInitService, PrismaService],
  controllers: [GoogleBloggerController],
  exports: [GoogleBloggerService],
})
export class GoogleBloggerModule {}

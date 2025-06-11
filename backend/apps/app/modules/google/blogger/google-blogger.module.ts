import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GoogleBloggerService } from './google-blogger.service'
import { GoogleBloggerController } from './google-blogger.controller'

@Module({
  imports: [HttpModule],
  providers: [GoogleBloggerService],
  controllers: [GoogleBloggerController],
  exports: [GoogleBloggerService],
})
export class GoogleBloggerModule {}

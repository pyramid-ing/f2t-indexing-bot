import { Module } from '@nestjs/common'
import { GoogleIndexerModule } from './indexer/google-indexer.module'
import { GoogleBloggerModule } from './blogger/google-blogger.module'
import { GoogleOauthModule } from './oauth/google-oauth.module'

@Module({
  imports: [GoogleIndexerModule, GoogleBloggerModule, GoogleOauthModule],
  exports: [GoogleIndexerModule, GoogleBloggerModule, GoogleOauthModule],
})
export class GoogleModule {}

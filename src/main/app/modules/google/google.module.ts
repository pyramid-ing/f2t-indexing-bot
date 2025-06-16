import { Module } from '@nestjs/common'
import { GoogleBloggerModule } from 'src/main/app/modules/google/blogger/google-blogger.module'
import { GoogleIndexerModule } from 'src/main/app/modules/google/indexer/google-indexer.module'
import { GoogleOauthModule } from 'src/main/app/modules/google/oauth/google-oauth.module'

@Module({
  imports: [GoogleIndexerModule, GoogleBloggerModule, GoogleOauthModule],
  exports: [GoogleIndexerModule, GoogleBloggerModule, GoogleOauthModule],
})
export class GoogleModule {}

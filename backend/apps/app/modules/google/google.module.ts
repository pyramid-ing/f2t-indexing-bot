import { Module } from '@nestjs/common'
import { GoogleIndexerModule } from './indexer/google-indexer.module'
import { GoogleSearchConsoleModule } from './search-console/google-search-console.module'
import { GoogleBloggerModule } from './blogger/google-blogger.module'
import { GoogleOauthModule } from '@prd/apps/app/modules/google/oauth/google-oauth.module'

@Module({
  imports: [GoogleIndexerModule, GoogleSearchConsoleModule, GoogleBloggerModule, GoogleOauthModule],
  exports: [GoogleIndexerModule, GoogleSearchConsoleModule, GoogleBloggerModule, GoogleOauthModule],
})
export class GoogleModule {}

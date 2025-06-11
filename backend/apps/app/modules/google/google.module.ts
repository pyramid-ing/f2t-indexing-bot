import { Module } from '@nestjs/common'
import { GoogleIndexerModule } from './indexer/google-indexer.module'
import { GoogleSearchConsoleModule } from './search-console/google-search-console.module'
import { GoogleBloggerModule } from './blogger/google-blogger.module'
import { GoogleOAuthModule } from './oauth/google-oauth.module'

@Module({
  imports: [GoogleIndexerModule, GoogleSearchConsoleModule, GoogleBloggerModule, GoogleOAuthModule],
  exports: [GoogleIndexerModule, GoogleSearchConsoleModule, GoogleBloggerModule, GoogleOAuthModule],
})
export class GoogleModule {}

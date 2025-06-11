import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
// import { GoogleSearchConsoleService } from './google-search-console.service'
// import { GoogleSearchConsoleController } from './google-search-console.controller'
import { GoogleAuthService } from '@prd/apps/app/shared/google-auth.service'

@Module({
  imports: [HttpModule],
  providers: [
    // GoogleSearchConsoleService,
    GoogleAuthService,
  ],
  controllers: [
    // GoogleSearchConsoleController,
  ],
  exports: [
    // GoogleSearchConsoleService,
  ],
})
export class GoogleSearchConsoleModule {}

import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { NaverIndexerService } from './naver-indexer.service'
import { NaverIndexerController } from './naver-indexer.controller'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  imports: [HttpModule],
  providers: [NaverIndexerService, PrismaService],
  controllers: [NaverIndexerController],
  exports: [NaverIndexerService],
})
export class NaverIndexerModule {}

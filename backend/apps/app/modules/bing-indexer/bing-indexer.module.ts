import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BingIndexerService } from './bing-indexer.service'
import { BingIndexerController } from './bing-indexer.controller'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  imports: [HttpModule],
  providers: [BingIndexerService, PrismaService],
  controllers: [BingIndexerController],
  exports: [BingIndexerService],
})
export class BingIndexerModule {}

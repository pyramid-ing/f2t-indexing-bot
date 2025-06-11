import { Module } from '@nestjs/common'
import { DaumIndexerService } from './daum-indexer.service'
import { DaumIndexerController } from './daum-indexer.controller'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  providers: [DaumIndexerService, PrismaService],
  controllers: [DaumIndexerController],
  exports: [DaumIndexerService],
})
export class DaumIndexerModule {}

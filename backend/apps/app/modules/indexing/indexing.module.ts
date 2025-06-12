import { Module } from '@nestjs/common'
import { IndexingController } from './indexing.controller'
import { IndexingService } from './indexing.service'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

@Module({
  controllers: [IndexingController],
  providers: [IndexingService, PrismaService],
})
export class IndexingModule {}

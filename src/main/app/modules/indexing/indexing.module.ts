import { PrismaService } from '@main/app/shared/prisma.service'
import { Module } from '@nestjs/common'
import { IndexingController } from 'src/main/app/modules/indexing/indexing.controller'
import { IndexingService } from 'src/main/app/modules/indexing/indexing.service'

@Module({
  controllers: [IndexingController],
  providers: [IndexingService, PrismaService],
})
export class IndexingModule {}

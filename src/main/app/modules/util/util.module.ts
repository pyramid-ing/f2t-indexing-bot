import { Module } from '@nestjs/common'
import { UtilService } from 'src/main/app/modules/util/util.service'

@Module({
  imports: [],
  providers: [UtilService],
  exports: [UtilService],
})
export class UtilModule {}

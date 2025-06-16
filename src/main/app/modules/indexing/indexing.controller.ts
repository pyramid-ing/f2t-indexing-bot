import { Body, Controller, Post } from '@nestjs/common'
import { IndexProvider } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsString } from 'class-validator'
import { IndexingService } from 'src/main/app/modules/indexing/indexing.service'

class CheckExistingDto {
  @IsArray()
  @IsString({ each: true })
  urls: string[]

  @Transform(({ value }) => value.map((v: string) => v.toUpperCase()))
  @IsArray()
  @IsEnum(IndexProvider, { each: true })
  providers: IndexProvider[]
}

@Controller('indexing')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post('check-existing')
  async checkExisting(@Body() checkExistingDto: CheckExistingDto) {
    const { urls, providers } = checkExistingDto
    return this.indexingService.getExistingUrls(urls, providers)
  }
}

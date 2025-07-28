import { IsString } from 'class-validator'

export enum IndexProvider {
  GOOGLE = 'GOOGLE',
  NAVER = 'NAVER',
  DAUM = 'DAUM',
  BING = 'BING',
}

export class CreateIndexJobDto {
  @IsString()
  url: string
}

import { BadRequestException, Logger, ValidationError, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import * as bodyParser from 'body-parser'
import * as portfinder from 'portfinder'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { AppModule } from '@prd/apps/app/app.module'
import { environment } from '@prd/apps/environments/environment'
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston'
import winston from 'winston'
import { HttpAdapterHost } from '@nestjs/core'
import { GlobalExceptionFilter } from '@prd/apps/filters/global-exception.filter'

dayjs.extend(utc)
dayjs.extend(timezone)

async function bootstrap() {
  const instance = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('ITB', {
            colors: true,
            prettyPrint: true,
          }),
        ),
        level: environment.production ? 'info' : 'silly',
      }),
    ],
  })

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance,
    }),
  })

  app.enableCors()
  // app.enableVersioning({
  //   defaultVersion: '1',
  //   type: VersioningType.URI,
  // })
  // app.setGlobalPrefix('api', { exclude: ['sitemap.xml'] })
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        console.error(JSON.stringify(validationErrors))
        return new BadRequestException(validationErrors)
      },
    }),
  )

  const httpAdapter = app.get(HttpAdapterHost)
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapter)) // HttpAdapterHost 주입

  // Support 10mb csv/json files for importing activities
  app.use(bodyParser.json({ limit: '10mb' }))

  // ConfigService를 사용한 정적 포트 할당 대신 portfinder로 동적 포트를 찾습니다.
  const port = await portfinder.getPortPromise({
    port: 3030,
    stopPort: 3080,
  })
  const host = '0.0.0.0'

  await app.listen(port, host, () => {
    logLogo()
    Logger.log(`Listening at http://${host}:${port}`)
    // Electron 메인 프로세스가 포트를 감지할 수 있도록 표준 출력으로 로그를 남깁니다.
    console.log(`BACKEND_PORT=${port}`)
  })
}

function logLogo() {
  Logger.log(`
███████╗ ██████╗ ██████╗     ██╗   ██╗████████╗██╗██╗     
██╔══██╗██╔══██╗██╔══██╗    ██║   ██║╚══██╔══╝██║██║     
██████╔╝██████╔╝██████╔╝    ██║   ██║   ██║   ██║██║     
██╔═══╝ ██╔═══╝ ██╔═══╝     ██║   ██║   ██║   ██║██║     
██║     ██║     ██║         ╚██████╔╝   ██║   ██║███████╗
╚═╝     ╚═╝     ╚═╝          ╚═════╝    ╚═╝   ╚═╝╚══════╝   ${environment.version}
  `)
}

bootstrap()

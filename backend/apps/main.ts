import { BadRequestException, Logger, ValidationError, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import * as bodyParser from 'body-parser'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { AppModule } from '@prd/apps/app/app.module'
import { environment } from '@prd/apps/environments/environment'
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston'
import winston from 'winston'
import { ConfigService } from '@nestjs/config'
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

  const appInstance = app.getHttpAdapter().getInstance()

  const configApp = await NestFactory.create(AppModule)
  const configService = configApp.get<ConfigService>(ConfigService)

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

  const HOST = configService.get<string>('HOST') || '0.0.0.0'
  const PORT = configService.get<number>('PORT') || 3000

  await app.listen(PORT, HOST, () => {
    logLogo()
    Logger.log(`Listening at http://${HOST}:${PORT}`)
    Logger.log('')
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

import { Injectable } from '@nestjs/common'
@Injectable()
export class CronService {
  public constructor() {}

  // @Cron(CronExpression.EVERY_HOUR)
  // public async runEveryHour() {
  //   await this.dataGatheringService.gather7Days();
  // }
  //
  // @Cron(CronExpression.EVERY_12_HOURS)
  // public async runEveryTwelveHours() {
  //   await this.exchangeRateDataService.loadCurrencies();
  // }
  //
  // @Cron(CronExpression.EVERY_DAY_AT_5PM)
  // public async runEveryDayAtFivePm() {
  //   this.twitterBotService.tweetFearAndGreedIndex();
  // }
  //
  // @Cron(CronService.EVERY_SUNDAY_AT_LUNCH_TIME)
  // public async runEverySundayAtTwelvePm() {
  //   const uniqueAssets = await this.dataGatheringService.getUniqueAssets();
  //
  //   await this.dataGatheringService.addJobsToQueue(
  //     uniqueAssets.map(({ dataSource, symbol }) => {
  //       return {
  //         data: {
  //           dataSource,
  //           symbol
  //         },
  //         name: GATHER_ASSET_PROFILE_PROCESS,
  //         opts: {
  //           ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
  //           jobId: getAssetProfileIdentifier({ dataSource, symbol })
  //         }
  //       };
  //     })
  //   );
  // }
}

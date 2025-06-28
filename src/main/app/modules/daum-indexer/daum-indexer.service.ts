import fs from 'node:fs'
import path from 'node:path'
import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { PrismaService } from '@main/app/shared/prisma.service'
import { SettingsService } from '@main/app/shared/settings.service'
import { sleep } from '@main/app/utils/sleep'
import { DaumAuthError, DaumConfigError, DaumSubmissionError } from '@main/filters/error.types'
import { Injectable, Logger } from '@nestjs/common'
import { Page } from 'puppeteer-core'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

export interface DaumIndexerOptions {
  urlsToIndex: string[]
  siteId?: number // siteId 추가 (사이트별 설정 우선 사용)
  siteUrl?: string // 옵션으로 변경
  pin?: string // 옵션으로 변경: DB에서 가져올 수 있음
}

@Injectable()
export class DaumIndexerService {
  private readonly logger = new Logger(DaumIndexerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  private async getDaumConfig(siteId?: number, siteUrl?: string) {
    try {
      // 1. 사이트별 설정 우선 확인
      if (siteId) {
        try {
          const siteConfig = await this.siteConfigService.getSiteConfig(siteId)

          if (siteConfig.daumConfig && siteConfig.daumConfig.use) {
            const config = siteConfig.daumConfig

            if (!config.siteUrl) {
              throw new DaumConfigError(
                '사이트별 Daum 설정에서 사이트 URL이 필요합니다.',
                'getDaumConfig',
                'site_url',
                {
                  siteId,
                  hasSiteUrl: false,
                },
              )
            }

            if (!config.password) {
              throw new DaumConfigError('사이트별 Daum 설정에서 PIN 코드가 필요합니다.', 'getDaumConfig', 'pin_code', {
                siteId,
                hasPinCode: false,
              })
            }

            return {
              siteUrl: config.siteUrl,
              password: config.password,
              headless: config.headless ?? true,
            }
          }
        } catch (error) {
          // 사이트별 설정이 없거나 비활성화된 경우 글로벌 설정으로 fallback
          this.logger.log(`사이트별 Daum 설정을 사용할 수 없음, 글로벌 설정으로 fallback: ${error.message}`)
        }
      }
    } catch (error) {
      if (error instanceof DaumConfigError) {
        throw error
      }
      throw new DaumConfigError(`Daum 설정 조회 실패: ${error.message}`, 'getDaumConfig', 'settings_fetch', { siteId })
    }
  }

  private getDaumCookiePath(siteUrl?: string) {
    const cookieDir = process.env.COOKIE_DIR
    if (!fs.existsSync(cookieDir)) fs.mkdirSync(cookieDir, { recursive: true })
    const safeSite = (siteUrl || 'default').replace(/[^\w\-]/g, '_')
    return path.join(cookieDir, `daum_${safeSite}.json`)
  }

  private async loadCookies(page: Page, siteUrl?: string) {
    const cookiePath = this.getDaumCookiePath(siteUrl)
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await page.setCookie(...cookies)
      this.logger.log('쿠키를 불러와 세션을 복원합니다.')
      return true
    }
    return false
  }

  private async saveCookies(page: Page, siteUrl?: string) {
    const cookiePath = this.getDaumCookiePath(siteUrl)
    const cookies = await page.cookies()
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8')
    this.logger.log('쿠키를 저장했습니다.')
  }

  async manualIndexing(
    options: DaumIndexerOptions,
    headless?: boolean,
  ): Promise<{ url: string; status: string; msg: string }[]> {
    const { urlsToIndex, siteId, siteUrl } = options

    try {
      // DB에서 Daum 설정 가져오기 (사이트별 설정 우선)
      const dbConfig = await this.getDaumConfig(siteId, siteUrl)
      const daumSiteUrl = dbConfig.siteUrl
      const pin = dbConfig.password
      const useHeadless = headless !== undefined ? headless : dbConfig.headless // 설정에서 headless 값 사용

      const launchOptions: any = {
        headless: useHeadless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--lang=ko-KR,ko',
        ],
        defaultViewport: { width: 1280, height: 900 },
      }
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      }

      let browser
      let page
      try {
        browser = await puppeteer.launch(launchOptions)
        page = await browser.newPage()
        await page.setExtraHTTPHeaders({
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        })
      } catch (error) {
        throw new DaumSubmissionError(`브라우저 초기화 실패: ${error.message}`, 'manualIndexing', undefined, siteUrl, {
          headless: useHeadless,
          executablePath: launchOptions.executablePath,
        })
      }

      let loggedIn = false
      try {
        if (await this.loadCookies(page, daumSiteUrl)) {
          await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
          await sleep(1000)
          const isLoginPage = await page.evaluate(() => {
            return !!document.querySelector('form.form_register input#authSiteUrl')
          })
          if (!isLoginPage) {
            loggedIn = true
            this.logger.log('쿠키로 로그인 세션 복원 성공')
          }
        }
        if (!loggedIn) {
          await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
          await sleep(2000)
          const isLoginPage = await page.evaluate(() => {
            return !!document.querySelector('form.form_register input#authSiteUrl')
          })
          if (isLoginPage) {
            if (!daumSiteUrl || !pin) {
              await browser.close()
              throw new DaumAuthError('로그인 필요: siteUrl, pin 값을 설정하거나 입력하세요.', 'manualIndexing', {
                hasSiteUrl: !!daumSiteUrl,
                hasPin: !!pin,
              })
            }
            await page.type('#authSiteUrl', daumSiteUrl, { delay: 20 })
            await page.type('#authPinCode', pin, { delay: 20 })
            await page.click('button.btn_register')
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })

            // 로그인 실패 확인 (로그인 페이지로 돌아왔는지)
            if (page.url().startsWith('https://webmaster.daum.net/login')) {
              await browser.close()
              throw new DaumAuthError('Daum 로그인 실패: URL 또는 PIN 코드가 올바르지 않습니다.', 'manualIndexing', {
                daumSiteUrl,
                hasPin: !!pin,
              })
            }

            this.logger.log('다음 로그인 완료')
            if (page.url().includes('/dashboard')) {
              await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
              await sleep(2000)
            }
            await this.saveCookies(page, daumSiteUrl)
          } else {
            this.logger.warn('로그인 폼이 감지되지 않음, 이미 로그인된 상태일 수 있음')
          }
        }
      } catch (error) {
        await browser.close()
        if (error instanceof DaumAuthError) {
          throw error
        }
        throw new DaumAuthError(`Daum 로그인 실패: ${error.message}`, 'manualIndexing', {
          daumSiteUrl,
          hasPin: !!pin,
        })
      }

      const results: { url: string; status: string; msg: string }[] = []

      for (const url of urlsToIndex) {
        try {
          await page.waitForSelector('#collectReqUrl', { timeout: 10000 })
          await page.evaluate(() => {
            const input = document.querySelector('#collectReqUrl') as HTMLInputElement
            if (input) input.value = ''
          })
          await page.type('#collectReqUrl', url, { delay: 2 })
          await page.click('.btn_result')
          let isSuccess = false
          let msg = ''
          const timeoutMs = 10000
          const pollInterval = 300
          const start = Date.now()
          while (Date.now() - start < timeoutMs) {
            isSuccess = await page.evaluate(() => {
              const layer = document.querySelector('.webmaster_layer.layer_collect')
              return layer && !layer.classList.contains('hide')
            })
            if (isSuccess) break
            await sleep(pollInterval)
          }

          let result
          if (isSuccess) {
            msg = '수집요청 완료'
            result = { url, status: 'success', msg }
            await page.click('.btn_confirm')
            await sleep(500)

            // 성공 로그 기록
            // TODO: indexingLog 모델이 구현되면 활성화
            // await this.prisma.indexingLog.create({
            //   data: {
            //     siteUrl: 'global', // 전역 설정이므로 임시값
            //     targetUrl: url,
            //     provider: 'DAUM',
            //     status: 'SUCCESS',
            //     message: msg,
            //     responseData: JSON.stringify(result),
            //   },
            // })
          } else {
            msg = '수집요청 실패 또는 레이어 미노출'
            result = { url, status: 'fail', msg }

            // 실패 로그 기록
            // TODO: indexingLog 모델이 구현되면 활성화
            // await this.prisma.indexingLog.create({
            //   data: {
            //     siteUrl: 'global', // 전역 설정이므로 임시값
            //     targetUrl: url,
            //     provider: 'DAUM',
            //     status: 'FAILED',
            //     message: msg,
            //     responseData: JSON.stringify(result),
            //   },
            // })
          }
          results.push(result)
          await sleep(1000)
        } catch (e: any) {
          const result = { url, status: 'error', msg: `[에러] ${e?.message || e}` }
          results.push(result)

          // 에러 로그 기록
          // TODO: indexingLog 모델이 구현되면 활성화
          // await this.prisma.indexingLog.create({
          //   data: {
          //     siteUrl: 'global', // 전역 설정이므로 임시값
          //     targetUrl: url,
          //     provider: 'DAUM',
          //     status: 'FAILED',
          //     message: result.msg,
          //     responseData: JSON.stringify(result),
          //   },
          // })
        }
      }
      await browser.close()
      this.logger.log('모든 Daum 색인 요청이 완료되었습니다.')

      const failedResults = results.filter(r => r.status === 'error' || r.status === 'fail')

      if (failedResults.length > 0) {
        throw new DaumSubmissionError(
          `${failedResults.length}/${urlsToIndex.length}개의 URL 색인 요청에 실패했습니다.`,
          'manualIndexing',
          undefined,
          siteUrl,
          {
            failedCount: failedResults.length,
            totalCount: urlsToIndex.length,
            failedUrls: failedResults.map(r => ({ url: r.url, error: r.msg, status: r.status })),
            results,
          },
        )
      }
      return results
    } catch (error) {
      if (error instanceof DaumAuthError || error instanceof DaumSubmissionError || error instanceof DaumConfigError) {
        throw error
      }
      throw new DaumSubmissionError(
        `Daum 색인 요청 중 에러 발생: ${error.message}`,
        'manualIndexing',
        undefined,
        siteUrl,
        {
          urlsToIndex,
          options,
          headless,
        },
      )
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Daum 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Daum 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const daumConfig = globalSettings.daum

      if (!daumConfig.use) {
        throw new DaumConfigError('Daum 인덱싱이 비활성화되어 있습니다.', 'indexUrls', 'indexing_service', {
          enabled: false,
        })
      }

      if (!daumConfig.password) {
        throw new DaumConfigError('Daum 비밀번호가 설정되지 않았습니다.', 'indexUrls', 'password', {
          hasPassword: false,
        })
      }

      // 임시 사이트 URL 사용 (전역 설정이므로)
      const options: DaumIndexerOptions = {
        siteUrl: daumConfig.siteUrl || 'global-site',
        urlsToIndex: urls,
        pin: daumConfig.password,
      }

      const results = await this.manualIndexing(options, daumConfig.headless)

      // 실패한 URL 추적
      const failedUrls = results.filter(result => result.status === 'error' || result.status === 'fail')

      // 실패한 URL이 있으면 에러 throw
      if (failedUrls.length > 0) {
        throw new DaumSubmissionError(
          `${failedUrls.length}/${urls.length} URL Daum 인덱싱 실패`,
          'indexUrls',
          undefined,
          'global',
          {
            failedUrls: failedUrls.map(result => ({
              url: result.url,
              error: result.msg,
              status: result.status,
            })),
            totalCount: urls.length,
            failedCount: failedUrls.length,
            results,
          },
        )
      }

      this.logger.log(`Daum 인덱싱 완료: ${results.length}개 URL 처리`)
      return { results }
    } catch (error) {
      this.logger.error('Daum 인덱싱 실패:', error)

      if (error instanceof DaumAuthError || error instanceof DaumSubmissionError || error instanceof DaumConfigError) {
        throw error
      }

      throw new DaumSubmissionError(`Daum 인덱싱 실패: ${error.message}`, 'indexUrls', undefined, 'global', {
        urlCount: urls.length,
      })
    }
  }
}

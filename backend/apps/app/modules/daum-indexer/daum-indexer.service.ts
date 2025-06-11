import { Injectable, Logger } from '@nestjs/common'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import { Page } from 'puppeteer'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'

puppeteer.use(StealthPlugin())

export interface DaumIndexerOptions {
  urlsToIndex: string[]
  siteUrl: string // 필수로 변경: DB에서 설정을 찾기 위해 필요
  pin?: string // 옵션으로 변경: DB에서 가져올 수 있음
}

@Injectable()
export class DaumIndexerService {
  private readonly logger = new Logger(DaumIndexerService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async getDaumConfig(siteUrl: string) {
    const site = await this.prisma.getSiteWithConfigs(siteUrl)
    if (!site) {
      throw new Error(`사이트 설정을 찾을 수 없습니다: ${siteUrl}`)
    }

    if (!site.daumConfig || !site.daumConfig.use) {
      throw new Error(`Daum 인덱싱이 비활성화되었습니다: ${siteUrl}`)
    }

    return {
      siteUrl: site.daumConfig.siteUrl || site.siteUrl,
      password: site.daumConfig.password,
      configuredSiteUrl: site.siteUrl,
    }
  }

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }

  private getDaumCookiePath(siteUrl?: string) {
    const isProd = process.env.NODE_ENV === 'production'
    const cookieDir = isProd ? process.env.COOKIE_DIR : path.join(process.cwd(), 'static', 'cookies')
    if (!fs.existsSync(cookieDir)) fs.mkdirSync(cookieDir, { recursive: true })
    const safeSite = (siteUrl || 'default').replace(/[^a-zA-Z0-9_\-]/g, '_')
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
    headless: boolean = true,
  ): Promise<{ url: string; status: string; msg: string }[]> {
    const { urlsToIndex, siteUrl } = options

    // DB에서 Daum 설정 가져오기
    const dbConfig = await this.getDaumConfig(siteUrl)
    const daumSiteUrl = dbConfig.siteUrl
    const pin = options.pin || dbConfig.password

    const launchOptions: any = {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--lang=ko-KR,ko',
      ],
      defaultViewport: { width: 1280, height: 900 },
    }
    if (process.env.NODE_ENV === 'production' && process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    }
    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    })

    let loggedIn = false
    if (await this.loadCookies(page, daumSiteUrl)) {
      await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
      await this.sleep(2000)
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
      await this.sleep(2000)
      const isLoginPage = await page.evaluate(() => {
        return !!document.querySelector('form.form_register input#authSiteUrl')
      })
      if (isLoginPage) {
        if (!daumSiteUrl || !pin) {
          await browser.close()
          throw new Error('로그인 필요: siteUrl, pin 값을 설정하거나 입력하세요.')
        }
        await page.type('#authSiteUrl', daumSiteUrl, { delay: 20 })
        await page.type('#authPinCode', pin, { delay: 20 })
        await page.click('button.btn_register')
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })
        this.logger.log('다음 로그인 완료')
        if (page.url().includes('/dashboard')) {
          await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
          await this.sleep(2000)
        }
        await this.saveCookies(page, daumSiteUrl)
      } else {
        this.logger.warn('로그인 폼이 감지되지 않음, 이미 로그인된 상태일 수 있음')
      }
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
          await this.sleep(pollInterval)
        }

        let result
        if (isSuccess) {
          msg = '수집요청 완료'
          result = { url, status: 'success', msg }
          await page.click('.btn_confirm')
          await this.sleep(500)

          // 성공 로그 기록
          await this.prisma.createIndexingLog({
            siteUrl: dbConfig.configuredSiteUrl,
            targetUrl: url,
            provider: 'DAUM',
            status: 'SUCCESS',
            message: msg,
          })
        } else {
          msg = '수집요청 실패 또는 레이어 미노출'
          result = { url, status: 'fail', msg }

          // 실패 로그 기록
          await this.prisma.createIndexingLog({
            siteUrl: dbConfig.configuredSiteUrl,
            targetUrl: url,
            provider: 'DAUM',
            status: 'FAILED',
            message: msg,
          })
        }
        results.push(result)
        await this.sleep(1000)
      } catch (e: any) {
        const result = { url, status: 'error', msg: `[에러] ${e?.message || e}` }
        results.push(result)

        // 에러 로그 기록
        await this.prisma.createIndexingLog({
          siteUrl: dbConfig.configuredSiteUrl,
          targetUrl: url,
          provider: 'DAUM',
          status: 'FAILED',
          message: result.msg,
        })
      }
    }
    await browser.close()
    this.logger.log('모든 Daum 색인 요청이 완료되었습니다.')
    return results
  }
}

import { Injectable, Logger } from '@nestjs/common'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import { Page } from 'puppeteer'

puppeteer.use(StealthPlugin())

export interface DaumIndexerOptions {
  urlsToIndex: string[]
  siteUrl?: string
  pin?: string
}

@Injectable()
export class DaumIndexerService {
  private readonly logger = new Logger(DaumIndexerService.name)

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
    const { urlsToIndex, siteUrl, pin } = options
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
    if (await this.loadCookies(page, siteUrl)) {
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
        if (!siteUrl || !pin) {
          await browser.close()
          throw new Error('로그인 필요: siteUrl, pin 값을 입력하세요.')
        }
        await page.type('#authSiteUrl', siteUrl, { delay: 20 })
        await page.type('#authPinCode', pin, { delay: 20 })
        await page.click('button.btn_register')
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })
        this.logger.log('다음 로그인 완료')
        if (page.url().includes('/dashboard')) {
          await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle2' })
          await this.sleep(2000)
        }
        await this.saveCookies(page, siteUrl)
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
        if (isSuccess) {
          msg = '수집요청 완료'
          await page.click('.btn_confirm')
          await this.sleep(500)
        } else {
          msg = '수집요청 실패 또는 레이어 미노출'
        }
        results.push({ url, status: isSuccess ? 'success' : 'fail', msg })
        await this.sleep(1000)
      } catch (e: any) {
        results.push({ url, status: 'error', msg: `[에러] ${e?.message || e}` })
      }
    }
    await browser.close()
    this.logger.log('모든 Daum 색인 요청이 완료되었습니다.')
    return results
  }
}

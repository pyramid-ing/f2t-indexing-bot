import type { Browser, Page } from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaService } from '@main/app/shared/prisma.service'
import { SettingsService } from '@main/app/shared/settings.service'
import { NaverAuthError, NaverBrowserError, NaverLoginError, NaverSubmissionError } from '@main/filters/error.types'
import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { firstValueFrom } from 'rxjs'

puppeteer.use(StealthPlugin())

export interface NaverIndexerOptions {
  siteUrl: string
  urlsToIndex: string[]
  naverId?: string // 네이버 아이디(선택, 자동로그인용) - DB에서 가져올 수 있음
  naverPw?: string // 네이버 비번(선택, 자동로그인용) - DB에서 가져올 수 있음
}

export interface NaverLoginStatus {
  isLoggedIn: boolean
  needsLogin: boolean
  message: string
}

// 쿠키 저장 경로 분기 (tistory-bot 방식과 동일)
function getNaverCookiePath(naverId?: string) {
  const isProd = process.env.NODE_ENV === 'production'
  const cookieDir = process.env.COOKIE_DIR
  if (!require('node:fs').existsSync(cookieDir))
    require('node:fs').mkdirSync(cookieDir, { recursive: true })
  const naverIdForFile = (naverId || 'default').replace(/[^\w\-]/g, '_')
  return path.join(cookieDir, `naver_${naverIdForFile}.json`)
}

@Injectable()
export class NaverIndexerService implements OnModuleInit {
  private readonly logger = new Logger(NaverIndexerService.name)
  private loginBrowser: Browser | null = null
  private loginPage: Page | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit() {}

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }

  private async loadCookies(page: Page, naverId?: string) {
    const cookiePath = getNaverCookiePath(naverId)
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await page.setCookie(...cookies)
      this.logger.log('쿠키를 불러와 세션을 복원합니다.')
    }
    else {
      throw new Error('쿠키 파일이 존재하지 않습니다. 먼저 수동으로 로그인 후 쿠키를 저장해 주세요.')
    }
  }

  private async saveCookies(page: Page, naverId?: string) {
    const cookiePath = getNaverCookiePath(naverId)
    const cookies = await page.cookies()
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8')
    this.logger.log('쿠키를 저장했습니다.')
  }

  private async getNaverConfig() {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()

      if (!globalSettings.naver || !globalSettings.naver.use) {
        throw new NaverAuthError('Naver 색인이 비활성화되어 있습니다.', 'getNaverConfig', {
          enabled: false,
        })
      }

      if (!globalSettings.naver.naverId || !globalSettings.naver.password) {
        throw new NaverAuthError('Naver 인증 정보가 설정되지 않았습니다.', 'getNaverConfig', {
          hasNaverId: !!globalSettings.naver.naverId,
          hasPassword: !!globalSettings.naver.password,
        })
      }

      return {
        naverId: globalSettings.naver.naverId,
        password: globalSettings.naver.password,
        headless: globalSettings.naver.headless ?? true, // 기본값은 true
      }
    }
    catch (error) {
      if (error instanceof NaverAuthError) {
        throw error
      }
      throw new NaverAuthError(`Naver 설정 조회 실패: ${error.message}`, 'getNaverConfig')
    }
  }

  async manualIndexing(
    options: NaverIndexerOptions,
    headless?: boolean,
  ): Promise<{ url: string, status: string, msg: string }[]> {
    const { siteUrl, urlsToIndex } = options

    try {
      // DB에서 네이버 설정 가져오기 (옵션으로 전달된 값이 없을 경우)
      const dbConfig = await this.getNaverConfig()
      const naverId = options.naverId || dbConfig.naverId
      const naverPw = options.naverPw || dbConfig.password
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

      let browser: Browser
      let page: Page

      try {
        browser = await puppeteer.launch(launchOptions)
        page = await browser.newPage()
        await page.setExtraHTTPHeaders({
          'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        })
        await page.emulateTimezone('Asia/Seoul')
      }
      catch (error) {
        throw new NaverBrowserError(`브라우저 초기화 실패: ${error.message}`, 'manualIndexing', {
          headless: useHeadless,
          executablePath: launchOptions.executablePath,
        })
      }

      let needLogin = false
      try {
        await this.loadCookies(page, naverId)
        await page.goto(
          `https://searchadvisor.naver.com/console/site/request/crawl?site=${encodeURIComponent(siteUrl)}`,
          {
            waitUntil: 'networkidle2',
          },
        )
        await this.sleep(2001)
        // 1차: authorize로 이동되면 로그인 필요
        if (page.url().startsWith('https://nid.naver.com/oauth2.0/authorize')) {
          needLogin = true
          // authorize 페이지에서 바로 로그인 시도
          if (!naverId || !naverPw) {
            await browser.close()
            throw new NaverLoginError(
              '쿠키 만료 또는 쿠키 없음. 네이버 아이디/비밀번호를 options.naverId, options.naverPw로 전달해야 자동로그인 가능합니다.',
              'manualIndexing',
              true,
              { hasNaverId: !!naverId, hasNaverPw: !!naverPw },
            )
          }
          this.logger.log('네이버 authorize 페이지에서 로그인 시도')
          await page.waitForSelector('input#id', { timeout: 10000 })
          await page.type('input#id', naverId, { delay: 30 })
          await page.waitForSelector('input#pw', { timeout: 10000 })
          await page.type('input#pw', naverPw, { delay: 30 })
          await page.waitForSelector('button[type=submit]', { timeout: 10000 })
          await page.click('button[type=submit]')
          await this.sleep(2000)
        }
      }
      catch (error) {
        if (error instanceof NaverLoginError) {
          throw error
        }
        needLogin = true
      }

      // 네이버 로그인 자동화
      if (needLogin) {
        if (!naverId || !naverPw) {
          await browser.close()
          throw new NaverLoginError(
            '쿠키 만료 또는 쿠키 없음. 네이버 아이디/비밀번호를 options.naverId, options.naverPw로 전달해야 자동로그인 가능합니다.',
            'manualIndexing',
            true,
            { hasNaverId: !!naverId, hasNaverPw: !!naverPw },
          )
        }
        this.logger.log('네이버 로그인 자동화 시작')
        // nidlogin.login으로 자동 이동될 경우(로그인 실패, 캡챠 등)만 캡챠/에러 처리 루프 진입
        let captchaTries = 0
        while (page.url().startsWith('https://nid.naver.com/nidlogin.login') && captchaTries < 2) {
          // 새 페이지이므로 아이디/비밀번호 재입력
          await page.waitForSelector('input#id', { timeout: 10000 })
          await page.evaluate(() => {
            const idInput = document.querySelector('input#id') as HTMLInputElement
            if (idInput)
              idInput.value = ''
          })
          await page.type('input#id', naverId, { delay: 30 })
          await page.waitForSelector('input#pw', { timeout: 10000 })
          await page.evaluate(() => {
            const pwInput = document.querySelector('input#pw') as HTMLInputElement
            if (pwInput)
              pwInput.value = ''
          })
          await page.type('input#pw', naverPw, { delay: 30 })
          // 로그인 실패(아이디/비번 오류) 감지
          const loginError = await page.$eval('.error_message', el => el.textContent || '').catch(() => '')
          if (loginError && loginError.includes('아이디') && loginError.includes('비밀번호')) {
            await browser.close()
            throw new NaverAuthError('네이버 로그인 실패: 아이디 또는 비밀번호 오류', 'manualIndexing', {
              naverId: `${naverId.substring(0, 3)}***`,
              loginError,
            })
          }
          const captchaDiv = await page.$('#rcapt')
          if (captchaDiv) {
            this.logger.warn('캡챠 감지, 외부 서비스로 캡챠 풀이 요청')
            // 질문 추출
            const question = await page.$eval('#captcha_info', el => el.textContent || '')
            // 이미지 추출 (base64)
            const imgSrc = await page.$eval('#captchaimg', el => el.getAttribute('src') || '')
            // base64 -> buffer 변환 및 form-data 파일 전송
            const FormData = (await import('form-data')).default
            const form = new FormData()
            form.append('question', question)
            // data:image/png;base64,... 에서 base64 부분만 추출
            const base64 = imgSrc.split(',')[1]
            const imgBuffer = Buffer.from(base64, 'base64')
            form.append('receipt_image', imgBuffer, { filename: 'captcha.png', contentType: 'image/png' })

            const response = await firstValueFrom(
              this.httpService.post(`${this.configService.get('n8n.endpoint')}/naver-receipt-capcha`, form, {
                headers: form.getHeaders(),
              }),
            )
            const answer = response.data?.output?.trim() || ''

            if (!answer) {
              throw new NaverAuthError('캡챠 풀이 실패: 외부 서비스에서 답변을 받지 못함', 'manualIndexing', {
                captchaTries,
                question,
                hasImageSrc: !!imgSrc,
              })
            }
            // 캡챠 정답 입력
            await page.waitForSelector('input#captcha', { timeout: 3000 })
            await page.type('input#captcha', answer, { delay: 30 })
            await page.waitForSelector('button[type=submit]', { timeout: 3000 })
            await page.click('button[type=submit]')
            await this.sleep(2000)
            captchaTries++
          }
          else {
            break
          }
        }

        if (captchaTries >= 2) {
          await browser.close()
          throw new NaverAuthError('네이버 로그인 실패: 영수증(캡챠) 3회 이상 실패', 'manualIndexing', {
            captchaTries,
            naverId: `${naverId.substring(0, 3)}***`,
          })
        }
        // 로그인 성공 후 쿠키 저장
        if (!page.url().includes('nid.naver.com')) {
          this.logger.log('네이버 로그인 성공, 쿠키 저장')
          await this.saveCookies(page, naverId)
          // 색인 요청 페이지로 이동
          await page.goto(
            `https://searchadvisor.naver.com/console/site/request/crawl?site=${encodeURIComponent(siteUrl)}`,
            {
              waitUntil: 'networkidle2',
            },
          )
          await this.sleep(2000)
        }
        else {
          await browser.close()
          throw new NaverAuthError('네이버 로그인 실패(캡챠 포함)', 'manualIndexing', {
            captchaTries,
            naverId: `${naverId.substring(0, 3)}***`,
          })
        }
      }

      let dialogAppeared = false
      let dialogMsg = ''
      page.removeAllListeners('dialog')
      page.on('dialog', async (dialog) => {
        dialogAppeared = true
        dialogMsg = dialog.message()
        await dialog.dismiss()
      })

      const results: { url: string, status: string, msg: string }[] = []

      for (const url of urlsToIndex) {
        dialogAppeared = false
        dialogMsg = ''
        try {
          const inputSelector = 'input[type="text"][maxlength="2048"]'
          await page.waitForSelector(inputSelector, { timeout: 5000 })
          await page.evaluate((selector) => {
            const input = document.querySelector(selector) as HTMLInputElement
            if (input)
              input.value = ''
          }, inputSelector)
          await page.type(inputSelector, url, { delay: 5 })
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'))
            for (const btn of buttons) {
              if (btn.textContent && btn.textContent.trim() === '확인') {
                ;(btn as HTMLElement).click()
                break
              }
            }
          })

          await this.sleep(1000)
          const timeoutMs = 20000
          const pollInterval = 500
          let isSuccess = false
          const start = Date.now()

          while (Date.now() - start < timeoutMs) {
            if (dialogAppeared)
              break
            isSuccess = await page.evaluate((url) => {
              const firstRowLink = document.querySelector(
                '.v-data-table__wrapper tbody tr:first-child td:nth-child(2) a',
              )
              if (!firstRowLink)
                return false
              const inputUrl = new URL(url)
              return firstRowLink.textContent?.trim() === inputUrl.pathname || firstRowLink.getAttribute('href') === url
            }, url)
            if (isSuccess)
              break
            await this.sleep(pollInterval)
          }

          if (dialogAppeared) {
            const result = {
              url,
              status: 'skipped',
              msg: dialogMsg || '이미 요청된 URL',
            }
            results.push(result)

            // 로그 기록 (RETRY 상태로 기록)
            await this.prisma.indexingLog.create({
              data: {
                siteUrl: 'global',
                targetUrl: url,
                provider: 'NAVER',
                status: 'RETRY',
                message: result.msg,
              },
            })

            continue
          }

          let result
          if (isSuccess) {
            result = {
              url,
              status: 'success',
              msg: '색인 요청 성공',
            }
            results.push(result)

            // 성공 로그 기록
            await this.prisma.indexingLog.create({
              data: {
                siteUrl: 'global',
                targetUrl: url,
                provider: 'NAVER',
                status: 'SUCCESS',
                message: result.msg,
              },
            })
          }
          else {
            result = {
              url,
              status: 'fail',
              msg: '색인 요청 실패 또는 테이블에 20초 내 반영되지 않음',
            }
            results.push(result)

            // 실패 로그 기록
            await this.prisma.indexingLog.create({
              data: {
                siteUrl: 'global',
                targetUrl: url,
                provider: 'NAVER',
                status: 'FAILED',
                message: result.msg,
              },
            })
          }
          await this.sleep(1000)
        }
        catch (e: any) {
          const result = {
            url,
            status: 'error',
            msg: `[에러] ${e?.message || e}`,
          }
          results.push(result)

          // 에러 로그 기록
          await this.prisma.indexingLog.create({
            data: {
              siteUrl: 'global',
              targetUrl: url,
              provider: 'NAVER',
              status: 'FAILED',
              message: result.msg,
            },
          })
        }
      }

      await browser.close()
      this.logger.log('모든 색인 요청이 완료되었습니다.')

      const failedResults = results.filter(r => r.status === 'error' || r.status === 'fail')

      if (failedResults.length > 0) {
        throw new NaverSubmissionError(
          `${failedResults.length}/${urlsToIndex.length}개의 URL 색인 요청에 실패했습니다.`,
          'manualIndexing',
          undefined,
          siteUrl,
          {
            failedCount: failedResults.length,
            totalCount: urlsToIndex.length,
            failedUrls: failedResults.map(r => ({ url: r.url, error: r.msg, status: r.status })),
            results, // 상세 뷰를 위해 전체 결과 포함
          },
        )
      }

      return results
    }
    catch (error) {
      if (
        error instanceof NaverAuthError
        || error instanceof NaverLoginError
        || error instanceof NaverSubmissionError
        || error instanceof NaverBrowserError
      ) {
        throw error
      }
      throw new NaverSubmissionError(`색인 요청 중 에러 발생: ${error.message}`, 'manualIndexing', undefined, siteUrl, {
        urlsToIndex,
        headless,
      })
    }
  }

  /**
   * 네이버 로그인 상태를 페이지에서 직접 확인
   */
  private async checkNaverLoginOnPage(page: Page): Promise<boolean> {
    try {
      // #account 요소가 없는 경우에만 네이버 메인으로 이동
      const hasAccountArea = await page.evaluate(() => {
        return !!document.querySelector('#account')
      })

      if (!hasAccountArea) {
        await page.goto('https://www.naver.com', {
          waitUntil: 'networkidle2',
          timeout: 10000,
        })
        await this.sleep(500)
      }

      // #account 영역에서 로그인 상태 확인
      return await page.evaluate(() => {
        const accountArea = document.querySelector('#account')
        if (!accountArea)
          return false

        // "네이버를 더 안전하고 편리하게 이용하세요" 텍스트가 있으면 로그아웃 상태
        const text = accountArea.textContent || ''
        return !text.includes('네이버를 더 안전하고 편리하게 이용하세요')
      })
    }
    catch (error) {
      this.logger.error('페이지에서 로그인 상태 확인 실패:', error)
      return false
    }
  }

  /**
   * 네이버 로그인 상태 확인 (headless)
   */
  async checkLoginStatus(): Promise<NaverLoginStatus> {
    try {
      const naverConfig = await this.getNaverConfig()

      const launchOptions: any = {
        headless: true,
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

      const browser = await puppeteer.launch(launchOptions)
      const page = await browser.newPage()

      await page.setExtraHTTPHeaders({
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      })
      await page.emulateTimezone('Asia/Seoul')

      try {
        // 저장된 쿠키 로드 시도
        await this.loadCookies(page, naverConfig.naverId)

        const isLoggedIn = await this.checkNaverLoginOnPage(page)

        await browser.close()

        if (!isLoggedIn) {
          return {
            isLoggedIn: false,
            needsLogin: true,
            message: '네이버 로그인이 필요합니다.',
          }
        }
        else {
          return {
            isLoggedIn: true,
            needsLogin: false,
            message: '네이버 로그인 상태입니다.',
          }
        }
      }
      catch (error) {
        await browser.close()
        return {
          isLoggedIn: false,
          needsLogin: true,
          message: '쿠키가 만료되었거나 존재하지 않습니다. 로그인이 필요합니다.',
        }
      }
    }
    catch (error) {
      this.logger.error('네이버 로그인 상태 확인 실패:', error)
      return {
        isLoggedIn: false,
        needsLogin: true,
        message: `로그인 상태 확인 실패: ${error.message}`,
      }
    }
  }

  /**
   * 수동 로그인을 위한 브라우저 창 열기
   */
  async openLoginBrowser(): Promise<{ success: boolean, message: string }> {
    if (this.loginBrowser) {
      this.logger.warn('이미 네이버 로그인 브라우저가 열려 있습니다.')
      try {
        // 이미 열려있는 페이지를 활성화 시도
        await this.loginPage?.bringToFront()
        return { success: true, message: '기존 로그인 창을 활성화했습니다.' }
      }
      catch (e) {
        // 무시하고 새로 열기
      }
    }

    try {
      const { naverId, password, headless } = await this.getNaverConfig()

      const launchOptions: any = {
        headless: false, // 로그인 창은 항상 보여줘야 함
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--window-size=600,800',
          '--lang=ko-KR,ko',
        ],
        defaultViewport: null,
      }
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      }

      this.loginBrowser = await puppeteer.launch(launchOptions)
      this.loginPage = (await this.loginBrowser.pages())[0]

      await this.loginPage.setExtraHTTPHeaders({ 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' })
      await this.loginPage.emulateTimezone('Asia/Seoul')

      await this.loginPage.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle2' })

      // ID와 비밀번호 자동 입력
      await this.loginPage.waitForSelector('#id', { timeout: 10000 })
      await this.loginPage.type('#id', naverId, { delay: 50 })

      await this.loginPage.waitForSelector('#pw', { timeout: 10000 })
      await this.loginPage.type('#pw', password, { delay: 50 })

      this.loginBrowser.on('disconnected', () => {
        this.logger.log('네이버 로그인 브라우저가 사용자에 의해 닫혔습니다.')
        this.loginBrowser = null
        this.loginPage = null
      })

      return { success: true, message: '네이버 로그인 창을 열었습니다. ID/PW를 확인하고 로그인해주세요.' }
    }
    catch (error) {
      if (this.loginBrowser) {
        await this.loginBrowser.close()
        this.loginBrowser = null
        this.loginPage = null
      }
      this.logger.error(`네이버 로그인 브라우저 열기 실패: ${error.message}`)

      if (error instanceof NaverAuthError) {
        throw error
      }

      throw new NaverBrowserError(`네이버 로그인 브라우저를 여는 데 실패했습니다: ${error.message}`, 'openLoginBrowser')
    }
  }

  /**
   * 사용자가 브라우저에서 로그인을 완료했는지 확인하고, 성공 시 쿠키를 저장합니다.
   */
  async checkLoginComplete(): Promise<{ success: boolean, message: string }> {
    try {
      if (!this.loginBrowser || !this.loginPage) {
        return {
          success: false,
          message: '로그인 브라우저가 열려있지 않습니다.',
        }
      }

      const naverConfig = await this.getNaverConfig()

      // 현재 페이지 URL 확인
      const currentUrl = this.loginPage.url()

      // 로그인이 완료되었는지 확인 (nid.naver.com이 아닌 다른 도메인으로 이동했는지)
      if (!currentUrl.includes('nid.naver.com')) {
        // 네이버 서치 어드바이저로 이동하여 최종 확인
        await this.loginPage.goto('https://searchadvisor.naver.com/console/site', {
          waitUntil: 'networkidle2',
        })

        await this.sleep(2000)

        // 다시 로그인 페이지로 리다이렉트되지 않았다면 로그인 성공
        if (!this.loginPage.url().includes('nid.naver.com')) {
          // 쿠키 저장
          await this.saveCookies(this.loginPage, naverConfig.naverId)

          // 브라우저 닫기
          await this.closeBrowser()

          this.logger.log('네이버 로그인 완료 및 쿠키 저장')

          return {
            success: true,
            message: '네이버 로그인이 완료되었습니다. 쿠키가 저장되었습니다.',
          }
        }
      }

      return {
        success: false,
        message: '아직 로그인이 완료되지 않았습니다. 계속 로그인을 진행해주세요.',
      }
    }
    catch (error) {
      this.logger.error('네이버 로그인 완료 확인 실패:', error)
      return {
        success: false,
        message: `로그인 완료 확인 실패: ${error.message}`,
      }
    }
  }

  /**
   * 로그인 브라우저 닫기
   */
  async closeBrowser(): Promise<void> {
    try {
      if (this.loginBrowser) {
        await this.loginBrowser.close()
        this.loginBrowser = null
        this.loginPage = null
        this.logger.log('네이버 로그인 브라우저를 닫았습니다.')
      }
    }
    catch (error) {
      this.logger.error('브라우저 닫기 실패:', error)
    }
  }

  async indexUrls(urls: string[]): Promise<any> {
    try {
      this.logger.log(`Naver 인덱싱 시작: ${urls.length}개 URL`)

      // 전역 Naver 설정 조회
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const naverConfig = globalSettings.naver

      if (!naverConfig.use) {
        throw new NaverAuthError('Naver 인덱싱이 비활성화되어 있습니다.', 'indexUrls', {
          enabled: false,
        })
      }

      if (!naverConfig.naverId || !naverConfig.password) {
        throw new NaverAuthError('Naver 인증 정보가 설정되지 않았습니다.', 'indexUrls', {
          hasNaverId: !!naverConfig.naverId,
          hasPassword: !!naverConfig.password,
        })
      }

      // 임시 사이트 URL 사용 (전역 설정이므로)
      const options: NaverIndexerOptions = {
        siteUrl: 'global-site',
        urlsToIndex: urls,
        naverId: naverConfig.naverId,
        naverPw: naverConfig.password,
      }

      const results = await this.manualIndexing(options, naverConfig.headless)

      // 실패한 URL 추적
      const failedUrls = results.filter(result => result.status === 'error' || result.status === 'fail')

      // 실패한 URL이 있으면 에러 throw
      if (failedUrls.length > 0) {
        throw new NaverSubmissionError(
          `${failedUrls.length}/${urls.length} URL Naver 인덱싱 실패`,
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

      this.logger.log(`Naver 인덱싱 완료: ${results.length}개 URL 처리`)
      return { results }
    }
    catch (error) {
      this.logger.error('Naver 인덱싱 실패:', error)

      if (
        error instanceof NaverAuthError
        || error instanceof NaverLoginError
        || error instanceof NaverSubmissionError
        || error instanceof NaverBrowserError
      ) {
        throw error
      }

      throw new NaverSubmissionError(`Naver 인덱싱 실패: ${error.message}`, 'indexUrls', undefined, 'global', {
        urlCount: urls.length,
      })
    }
  }
}

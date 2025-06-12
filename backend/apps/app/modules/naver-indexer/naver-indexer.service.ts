import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import type { Page, Browser } from 'puppeteer'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@prd/apps/app/shared/prisma.service'
import { SettingsService } from '../../shared/settings.service'
import { OnModuleInit } from '@nestjs/common'

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
  const cookieDir = isProd ? process.env.COOKIE_DIR : path.join(process.cwd(), 'static', 'cookies')
  if (!require('fs').existsSync(cookieDir)) require('fs').mkdirSync(cookieDir, { recursive: true })
  const naverIdForFile = (naverId || 'default').replace(/[^a-zA-Z0-9_\-]/g, '_')
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

  async onModuleInit() {
    // 애플리케이션 시작 시 네이버 로그인 상태 확인 (3초 지연 후)
    setTimeout(() => {
      this.initializeLoginStatus()
    }, 3000)
  }

  private sleep(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  }

  private async loadCookies(page: Page, naverId?: string) {
    const cookiePath = getNaverCookiePath(naverId)
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await page.setCookie(...cookies)
      this.logger.log('쿠키를 불러와 세션을 복원합니다.')
    } else {
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
    const globalSettings = await this.settingsService.getGlobalEngineSettings()

    if (!globalSettings.naver || !globalSettings.naver.use) {
      throw new Error('Naver 색인이 비활성화되어 있습니다.')
    }

    if (!globalSettings.naver.naverId || !globalSettings.naver.password) {
      throw new Error('Naver 인증 정보가 설정되지 않았습니다.')
    }

    return {
      naverId: globalSettings.naver.naverId,
      password: globalSettings.naver.password,
      headless: globalSettings.naver.headless ?? true, // 기본값은 true
    }
  }

  async manualIndexing(
    options: NaverIndexerOptions,
    headless?: boolean,
  ): Promise<{ url: string; status: string; msg: string }[]> {
    const { siteUrl, urlsToIndex } = options

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
    if (process.env.NODE_ENV === 'production' && process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    }
    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    })
    await page.emulateTimezone('Asia/Seoul')

    let needLogin = false
    try {
      await this.loadCookies(page, naverId)
      await page.goto(
        `https://searchadvisor.naver.com/console/site/request/crawl?site=${encodeURIComponent(siteUrl)}`,
        {
          waitUntil: 'networkidle2',
        },
      )
      await this.sleep(2000)
      // 1차: authorize로 이동되면 로그인 필요
      if (page.url().startsWith('https://nid.naver.com/oauth2.0/authorize')) {
        needLogin = true
        // authorize 페이지에서 바로 로그인 시도
        if (!naverId || !naverPw) {
          await browser.close()
          throw new Error(
            '쿠키 만료 또는 쿠키 없음. 네이버 아이디/비밀번호를 options.naverId, options.naverPw로 전달해야 자동로그인 가능합니다.',
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
    } catch {
      needLogin = true
    }

    // 네이버 로그인 자동화
    if (needLogin) {
      if (!naverId || !naverPw) {
        await browser.close()
        throw new Error(
          '쿠키 만료 또는 쿠키 없음. 네이버 아이디/비밀번호를 options.naverId, options.naverPw로 전달해야 자동로그인 가능합니다.',
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
          if (idInput) idInput.value = ''
        })
        await page.type('input#id', naverId, { delay: 30 })
        await page.waitForSelector('input#pw', { timeout: 10000 })
        await page.evaluate(() => {
          const pwInput = document.querySelector('input#pw') as HTMLInputElement
          if (pwInput) pwInput.value = ''
        })
        await page.type('input#pw', naverPw, { delay: 30 })
        // 로그인 실패(아이디/비번 오류) 감지
        const loginError = await page.$eval('.error_message', el => el.textContent || '').catch(() => '')
        if (loginError && loginError.includes('아이디') && loginError.includes('비밀번호')) {
          await browser.close()
          throw new Error('네이버 로그인 실패: 아이디 또는 비밀번호 오류')
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
            throw new Error('캡챠 풀이 실패: 외부 서비스에서 답변을 받지 못함')
          }
          // 캡챠 정답 입력
          await page.waitForSelector('input#captcha', { timeout: 3000 })
          await page.type('input#captcha', answer, { delay: 30 })
          await page.waitForSelector('button[type=submit]', { timeout: 3000 })
          await page.click('button[type=submit]')
          await this.sleep(2000)
          captchaTries++
        } else {
          break
        }
      }

      if (captchaTries >= 2) {
        await browser.close()
        throw new Error('네이버 로그인 실패: 영수증(캡챠) 3회 이상 실패')
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
      } else {
        await browser.close()
        throw new Error('네이버 로그인 실패(캡챠 포함)')
      }
    }

    let dialogAppeared = false
    let dialogMsg = ''
    page.removeAllListeners('dialog')
    page.on('dialog', async dialog => {
      dialogAppeared = true
      dialogMsg = dialog.message()
      await dialog.dismiss()
    })

    const results: { url: string; status: string; msg: string }[] = []

    for (const url of urlsToIndex) {
      dialogAppeared = false
      dialogMsg = ''
      try {
        const inputSelector = 'input[type="text"][maxlength="2048"]'
        await page.waitForSelector(inputSelector, { timeout: 5000 })
        await page.evaluate(selector => {
          const input = document.querySelector(selector) as HTMLInputElement
          if (input) input.value = ''
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
          if (dialogAppeared) break
          isSuccess = await page.evaluate(url => {
            const firstRowLink = document.querySelector('.v-data-table__wrapper tbody tr:first-child td:nth-child(2) a')
            if (!firstRowLink) return false
            const inputUrl = new URL(url)
            return firstRowLink.textContent?.trim() === inputUrl.pathname || firstRowLink.getAttribute('href') === url
          }, url)
          if (isSuccess) break
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
        } else {
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
      } catch (e: any) {
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
    return results
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

      if (process.env.NODE_ENV === 'production' && process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      }

      const browser = await puppeteer.launch(launchOptions)
      const page = await browser.newPage()

      await page.setExtraHTTPHeaders({
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      })
      await page.emulateTimezone('Asia/Seoul')

      let needsLogin = false

      try {
        // 저장된 쿠키 로드 시도
        await this.loadCookies(page, naverConfig.naverId)

        // 네이버 서치 어드바이저 페이지로 이동
        await page.goto('https://searchadvisor.naver.com/console/site', {
          waitUntil: 'networkidle2',
          timeout: 10000,
        })

        await this.sleep(2000)

        // 로그인 필요 여부 확인
        if (
          page.url().startsWith('https://nid.naver.com/oauth2.0/authorize') ||
          page.url().startsWith('https://nid.naver.com/nidlogin.login')
        ) {
          needsLogin = true
        }

        await browser.close()

        if (needsLogin) {
          return {
            isLoggedIn: false,
            needsLogin: true,
            message: '네이버 로그인이 필요합니다.',
          }
        } else {
          return {
            isLoggedIn: true,
            needsLogin: false,
            message: '네이버 로그인 상태입니다.',
          }
        }
      } catch (error) {
        await browser.close()
        return {
          isLoggedIn: false,
          needsLogin: true,
          message: '쿠키가 만료되었거나 존재하지 않습니다. 로그인이 필요합니다.',
        }
      }
    } catch (error) {
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
  async openLoginBrowser(): Promise<{ success: boolean; message: string }> {
    try {
      // 기존 브라우저가 열려있다면 닫기
      if (this.loginBrowser) {
        await this.closeBrowser()
      }

      const naverConfig = await this.getNaverConfig()

      const launchOptions: any = {
        headless: false, // 사용자가 수동으로 로그인할 수 있도록 브라우저 창 표시
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

      this.loginBrowser = await puppeteer.launch(launchOptions)
      this.loginPage = await this.loginBrowser.newPage()

      await this.loginPage.setExtraHTTPHeaders({
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      })
      await this.loginPage.emulateTimezone('Asia/Seoul')

      // 네이버 로그인 페이지로 이동
      await this.loginPage.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https://searchadvisor.naver.com/', {
        waitUntil: 'networkidle2',
      })

      this.logger.log('네이버 수동 로그인 브라우저를 열었습니다.')

      return {
        success: true,
        message: '네이버 로그인 페이지가 열렸습니다. 수동으로 로그인해주세요.',
      }
    } catch (error) {
      this.logger.error('네이버 로그인 브라우저 열기 실패:', error)
      return {
        success: false,
        message: `브라우저 열기 실패: ${error.message}`,
      }
    }
  }

  /**
   * 로그인 완료 확인 및 쿠키 저장
   */
  async checkLoginComplete(): Promise<{ success: boolean; message: string }> {
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
    } catch (error) {
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
    } catch (error) {
      this.logger.error('브라우저 닫기 실패:', error)
    }
  }

  /**
   * 애플리케이션 시작 시 네이버 로그인 상태 초기화
   */
  async initializeLoginStatus(): Promise<void> {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()

      if (!globalSettings.naver || !globalSettings.naver.use) {
        this.logger.log('네이버 서비스가 비활성화되어 있습니다.')
        return
      }

      this.logger.log('네이버 로그인 상태를 확인합니다...')
      const status = await this.checkLoginStatus()

      if (status.needsLogin) {
        this.logger.warn('네이버 로그인이 필요합니다. 수동 로그인을 진행해주세요.')
      } else {
        this.logger.log('네이버 로그인 상태가 정상입니다.')
      }
    } catch (error) {
      this.logger.error('네이버 로그인 상태 초기화 실패:', error)
    }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'
import path from 'path'
import type { Page } from 'puppeteer'
import { ConfigService } from '@nestjs/config'

puppeteer.use(StealthPlugin())

export interface NaverIndexerOptions {
  siteUrl: string
  urlsToIndex: string[]
  naverId?: string // 네이버 아이디(선택, 자동로그인용)
  naverPw?: string // 네이버 비번(선택, 자동로그인용)
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
export class NaverIndexerService {
  private readonly logger = new Logger(NaverIndexerService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

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

  async manualIndexing(
    options: NaverIndexerOptions,
    headless: boolean = true,
  ): Promise<{ url: string; status: string; msg: string }[]> {
    const { siteUrl, urlsToIndex, naverId, naverPw } = options
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
          results.push({
            url,
            status: 'skipped',
            msg: dialogMsg || '이미 요청된 URL',
          })
          continue
        }

        if (isSuccess) {
          results.push({
            url,
            status: 'success',
            msg: '색인 요청 성공',
          })
        } else {
          results.push({
            url,
            status: 'fail',
            msg: '색인 요청 실패 또는 테이블에 20초 내 반영되지 않음',
          })
        }
        await this.sleep(1000)
      } catch (e: any) {
        results.push({
          url,
          status: 'error',
          msg: `[에러] ${e?.message || e}`,
        })
      }
    }

    await browser.close()
    this.logger.log('모든 색인 요청이 완료되었습니다.')
    return results
  }
}

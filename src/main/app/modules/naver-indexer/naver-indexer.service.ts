import type { Browser, Page } from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { SettingsService } from '@main/app/modules/settings/settings.service'
import { NaverAuthError, NaverBrowserError, NaverLoginError, NaverSubmissionError } from '@main/filters/error.types'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { NaverAccountService } from './naver-account.service'
import { sleep } from '@main/app/utils/sleep'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import axios from 'axios'
import { JobLogsService } from '@main/app/modules/job-logs/job-logs.service'

puppeteer.use(StealthPlugin())

export interface NaverIndexerOptions {
  siteId: number
  urlsToIndex: string[]
  naverId?: string // 네이버 아이디 - NaverAccount에서 정보를 가져옴
  naverPw?: string // 네이버 비번 - NaverAccount에서 정보를 가져옴 (선택)
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
  if (!require('node:fs').existsSync(cookieDir)) require('node:fs').mkdirSync(cookieDir, { recursive: true })
  const naverIdForFile = (naverId || 'default').replace(/[^\w\-]/g, '_')
  return path.join(cookieDir, `naver_${naverIdForFile}.json`)
}

@Injectable()
export class NaverIndexerService implements OnModuleInit {
  private readonly logger = new Logger(NaverIndexerService.name)
  private loginBrowser: Browser | null = null
  private loginPage: Page | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly siteConfigService: SiteConfigService,
    private readonly naverAccountService: NaverAccountService,
    private readonly jobLogsService: JobLogsService,
  ) {}

  async onModuleInit() {}

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

  private async getNaverConfig(siteId: number) {
    try {
      // 사이트 설정 조회
      const siteConfig = await this.siteConfigService.getSiteConfig(siteId)
      if (!siteConfig) {
        throw new NaverAuthError(`등록되지 않은 사이트입니다: ${siteId}`, 'getNaverConfig', {
          siteId,
          exists: false,
        })
      }

      // 네이버 설정 확인
      if (!siteConfig.naverConfig || !siteConfig.naverConfig.use) {
        throw new NaverAuthError(`사이트의 네이버 설정이 비활성화되어 있습니다: ${siteId}`, 'getNaverConfig', {
          siteId,
          naverConfigEnabled: false,
        })
      }

      const naverAccountId = siteConfig.naverConfig.selectedNaverAccountId
      if (!naverAccountId) {
        throw new NaverAuthError(`사이트에 네이버 계정이 선택되지 않았습니다: ${siteId}`, 'getNaverConfig', {
          siteId,
          hasSelectedAccount: false,
        })
      }

      // 선택된 네이버 계정 조회
      const account = await this.naverAccountService.getAccountById(naverAccountId)
      if (!account) {
        throw new NaverAuthError(`등록되지 않은 네이버 계정입니다: ID ${naverAccountId}`, 'getNaverConfig', {
          siteId,
          accountId: naverAccountId,
          exists: false,
        })
      }

      if (!account.isActive) {
        throw new NaverAuthError(`비활성화된 네이버 계정입니다: ${account.naverId}`, 'getNaverConfig', {
          siteId,
          accountId: naverAccountId,
          naverId: account.naverId,
          isActive: false,
        })
      }

      return {
        naverId: account.naverId,
        password: account.password,
        headless: siteConfig.naverConfig.headless ?? true, // 사이트 설정의 headless 값 사용, 기본값 true
      }
    } catch (error) {
      if (error instanceof NaverAuthError) {
        throw error
      }
      throw new NaverAuthError(`Naver 설정 조회 실패: ${error.message}`, 'getNaverConfig', { siteId })
    }
  }

  async manualIndexing(
    options: NaverIndexerOptions,
    headless?: boolean,
  ): Promise<{ url: string; status: string; msg: string }[]> {
    const { siteId, urlsToIndex } = options

    try {
      // 사이트 존재 여부 검증
      await this.siteConfigService.validateSiteExists(siteId)

      // 각 URL에 대해 도메인 일치 검증
      for (const url of urlsToIndex) {
        await this.siteConfigService.validateUrlDomain(siteId, url)
      }

      // DB에서 네이버 설정 가져오기 (NaverAccount에서 조회)
      const siteConfig = await this.siteConfigService.getSiteConfig(siteId)
      const dbConfig = await this.getNaverConfig(siteId!)
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
      } catch (error) {
        throw new NaverBrowserError(`브라우저 초기화 실패: ${error.message}`, 'manualIndexing', {
          headless: useHeadless,
          executablePath: launchOptions.executablePath,
        })
      }

      // 쿠키 로드 및 로그인 상태 확인
      try {
        await this.loadCookies(page, naverId)
        await page.goto(`https://searchadvisor.naver.com/console/site/request/crawl?site=${siteConfig.siteUrl}`, {
          waitUntil: 'networkidle2',
        })
        await sleep(2000)

        // 네이버 로그인 페이지로 리다이렉트되면 로그인 필요
        if (page.url().includes('nid.naver.com')) {
          throw new NaverLoginError(
            '네이버 로그인이 필요합니다. 쿠키가 만료되었거나 존재하지 않습니다.',
            'manualIndexing',
            true,
            { currentUrl: page.url() },
          )
        }
      } catch (error) {
        await browser.close()
        if (error instanceof NaverLoginError) {
          throw error
        }
        throw new NaverLoginError(
          '네이버 로그인이 필요합니다. 쿠키가 만료되었거나 존재하지 않습니다.',
          'manualIndexing',
          true,
          { errorMessage: error.message },
        )
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

          await sleep(1000)
          const timeoutMs = 20000
          const pollInterval = 500
          let isSuccess = false
          const start = Date.now()

          while (Date.now() - start < timeoutMs) {
            if (dialogAppeared) break
            isSuccess = await page.evaluate(url => {
              const firstRowLink = document.querySelector(
                '.v-data-table__wrapper tbody tr:first-child td:nth-child(2) a',
              )
              if (!firstRowLink) return false
              const inputUrl = new URL(url)
              return firstRowLink.textContent?.trim() === inputUrl.pathname || firstRowLink.getAttribute('href') === url
            }, url)
            if (isSuccess) break
            await sleep(pollInterval)
          }

          if (dialogAppeared) {
            const result = {
              url,
              status: 'skipped',
              msg: dialogMsg || '이미 요청된 URL',
            }
            results.push(result)

            // 로그 기록 (RETRY 상태로 기록)
            const job = await this.prisma.indexJob.findFirst({
              where: {
                url,
                provider: 'NAVER',
              },
            })

            if (!job) {
              this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
              continue
            }

            await this.jobLogsService.create({
              jobId: job.jobId.toString(),
              message: `Naver 인덱싱 건너뜀: ${result.msg}`,
              level: 'info',
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
            const job = await this.prisma.indexJob.findFirst({
              where: {
                url,
                provider: 'NAVER',
              },
            })

            if (!job) {
              this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
              return result
            }

            await this.jobLogsService.create({
              jobId: job.jobId.toString(),
              message: `Naver 인덱싱 성공: ${url}`,
              level: 'info',
            })
          } else {
            result = {
              url,
              status: 'fail',
              msg: '색인 요청 실패 또는 테이블에 20초 내 반영되지 않음',
            }
            results.push(result)

            // 실패 로그 기록
            const job = await this.prisma.indexJob.findFirst({
              where: {
                url,
                provider: 'NAVER',
              },
            })

            if (!job) {
              this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
              throw new NaverSubmissionError(
                `Naver 인덱싱 실패: ${result.msg}`,
                'manualIndexing',
                undefined,
                undefined,
                {
                  urlsToIndex,
                  headless,
                },
              )
            }

            await this.jobLogsService.create({
              jobId: job.jobId.toString(),
              message: `Naver 인덱싱 실패: ${result.msg}`,
              level: 'error',
            })

            throw new NaverSubmissionError(`Naver 인덱싱 실패: ${result.msg}`, 'manualIndexing', undefined, undefined, {
              urlsToIndex,
              headless,
            })
          }
          await sleep(1000)
        } catch (e: any) {
          const result = {
            url,
            status: 'error',
            msg: `[에러] ${e?.message || e}`,
          }
          results.push(result)

          // 에러 로그 기록
          const job = await this.prisma.indexJob.findFirst({
            where: {
              url,
              provider: 'NAVER',
            },
          })

          if (!job) {
            this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
            continue
          }

          await this.jobLogsService.create({
            jobId: job.jobId.toString(),
            message: `Naver 인덱싱 에러: ${result.msg}`,
            level: 'error',
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
          undefined, // siteUrl 제거
          {
            failedCount: failedResults.length,
            totalCount: urlsToIndex.length,
            failedUrls: failedResults.map(r => ({ url: r.url, error: r.msg, status: r.status })),
            results, // 상세 뷰를 위해 전체 결과 포함
          },
        )
      }

      return results
    } catch (error) {
      if (
        error instanceof NaverAuthError ||
        error instanceof NaverLoginError ||
        error instanceof NaverSubmissionError ||
        error instanceof NaverBrowserError
      ) {
        throw error
      }
      throw new NaverSubmissionError(
        `색인 요청 중 에러 발생: ${error.message}`,
        'manualIndexing',
        undefined,
        undefined,
        {
          urlsToIndex,
          headless,
        },
      )
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
        await sleep(500)
      }

      // #account 영역에서 로그인 상태 확인
      return await page.evaluate(() => {
        const accountArea = document.querySelector('#account')
        if (!accountArea) return false

        // "네이버를 더 안전하고 편리하게 이용하세요" 텍스트가 있으면 로그아웃 상태
        const text = accountArea.textContent || ''
        return !text.includes('네이버를 더 안전하고 편리하게 이용하세요')
      })
    } catch (error) {
      this.logger.error('페이지에서 로그인 상태 확인 실패:', error)
      return false
    }
  }

  /**
   * 네이버 로그인 상태 확인 (headless)
   */
  async checkLoginStatus(naverId?: string): Promise<NaverLoginStatus> {
    try {
      // naverId로 직접 네이버 계정 조회
      if (!naverId) {
        throw new NaverAuthError('네이버 아이디가 필요합니다.', 'checkLoginStatus', {
          hasNaverId: false,
        })
      }

      const account = await this.naverAccountService.getAccountByNaverId(naverId)
      if (!account) {
        throw new NaverAuthError(`등록되지 않은 네이버 계정입니다: ${naverId}`, 'checkLoginStatus', {
          naverId,
          exists: false,
        })
      }

      if (!account.isActive) {
        throw new NaverAuthError(`비활성화된 네이버 계정입니다: ${naverId}`, 'checkLoginStatus', {
          naverId,
          isActive: false,
        })
      }

      const naverConfig = {
        naverId: account.naverId,
        password: account.password,
        headless: true, // 기본값
      }

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

        // 데이터베이스 로그인 상태 업데이트 (상태 확인 시점도 업데이트)
        try {
          await this.naverAccountService.updateLoginStatus(naverConfig.naverId, isLoggedIn, new Date())
        } catch (updateError) {
          this.logger.warn(`네이버 계정 로그인 상태 업데이트 실패: ${updateError.message}`)
        }

        if (!isLoggedIn) {
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

        // 오류 발생 시에도 로그인 상태를 false로 업데이트
        try {
          await this.naverAccountService.updateLoginStatus(naverConfig.naverId, false)
        } catch (updateError) {
          this.logger.warn(`네이버 계정 로그인 상태 업데이트 실패: ${updateError.message}`)
        }

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
  async openLoginBrowser(naverId?: string): Promise<{ success: boolean; message: string }> {
    if (this.loginBrowser) {
      this.logger.warn('이미 네이버 로그인 브라우저가 열려 있습니다.')
      try {
        // 이미 열려있는 페이지를 활성화 시도
        await this.loginPage?.bringToFront()
        return { success: true, message: '기존 로그인 창을 활성화했습니다.' }
      } catch (e) {
        // 무시하고 새로 열기
      }
    }

    try {
      // naverId로 직접 네이버 계정 조회
      if (!naverId) {
        throw new NaverAuthError('네이버 아이디가 필요합니다.', 'openLoginBrowser', {
          hasNaverId: false,
        })
      }

      const account = await this.naverAccountService.getAccountByNaverId(naverId)
      if (!account) {
        throw new NaverAuthError(`등록되지 않은 네이버 계정입니다: ${naverId}`, 'openLoginBrowser', {
          naverId,
          exists: false,
        })
      }

      if (!account.isActive) {
        throw new NaverAuthError(`비활성화된 네이버 계정입니다: ${naverId}`, 'openLoginBrowser', {
          naverId,
          isActive: false,
        })
      }

      const configNaverId = account.naverId
      const password = account.password

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
      await this.loginPage.type('#id', configNaverId, { delay: 50 })

      await this.loginPage.waitForSelector('#pw', { timeout: 10000 })
      await this.loginPage.type('#pw', password, { delay: 50 })

      this.loginBrowser.on('disconnected', () => {
        this.logger.log('네이버 로그인 브라우저가 사용자에 의해 닫혔습니다.')
        this.loginBrowser = null
        this.loginPage = null
      })

      return { success: true, message: '네이버 로그인 창을 열었습니다. ID/PW를 확인하고 로그인해주세요.' }
    } catch (error) {
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
  async checkLoginComplete(naverId?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.loginBrowser || !this.loginPage) {
        return {
          success: false,
          message: '로그인 브라우저가 열려있지 않습니다.',
        }
      }

      // naverId로 직접 네이버 계정 조회
      if (!naverId) {
        throw new NaverAuthError('네이버 아이디가 필요합니다.', 'checkLoginComplete', {
          hasNaverId: false,
        })
      }

      const account = await this.naverAccountService.getAccountByNaverId(naverId)
      if (!account) {
        throw new NaverAuthError(`등록되지 않은 네이버 계정입니다: ${naverId}`, 'checkLoginComplete', {
          naverId,
          exists: false,
        })
      }

      if (!account.isActive) {
        throw new NaverAuthError(`비활성화된 네이버 계정입니다: ${naverId}`, 'checkLoginComplete', {
          naverId,
          isActive: false,
        })
      }

      const naverConfig = {
        naverId: account.naverId,
        password: account.password,
      }

      // 현재 페이지 URL 확인
      const currentUrl = this.loginPage.url()

      // 로그인이 완료되었는지 확인 (nid.naver.com이 아닌 다른 도메인으로 이동했는지)
      if (!currentUrl.includes('nid.naver.com')) {
        // 네이버 서치 어드바이저로 이동하여 최종 확인
        await this.loginPage.goto('https://searchadvisor.naver.com/console/site', {
          waitUntil: 'networkidle2',
        })

        await sleep(2000)

        // 다시 로그인 페이지로 리다이렉트되지 않았다면 로그인 성공
        if (!this.loginPage.url().includes('nid.naver.com')) {
          // 쿠키 저장
          await this.saveCookies(this.loginPage, naverConfig.naverId)

          // 데이터베이스 로그인 상태 업데이트
          try {
            await this.naverAccountService.updateLoginStatus(naverConfig.naverId, true, new Date())
          } catch (updateError) {
            this.logger.warn(`네이버 계정 로그인 상태 업데이트 실패: ${updateError.message}`)
          }

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

  async submitUrl(siteId: number, url: string): Promise<{ success: boolean; message: string }> {
    try {
      const site = await this.prisma.site.findUnique({
        where: { id: siteId },
      })

      if (!site) {
        throw new Error('사이트를 찾을 수 없습니다.')
      }

      const settings = await this.settingsService.getAppStatus()
      const naverSettings = settings.naver

      if (!naverSettings?.clientId || !naverSettings?.clientSecret) {
        throw new Error('Naver API 설정이 완료되지 않았습니다.')
      }

      const response = await axios.post(
        'https://searchadapi.naver.com/api/v1/site/ping',
        {
          url,
        },
        {
          headers: {
            'X-Naver-Client-Id': naverSettings.clientId,
            'X-Naver-Client-Secret': naverSettings.clientSecret,
          },
        },
      )

      // 성공 로그
      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'NAVER',
        },
      })

      if (!job) {
        this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
        return {
          success: true,
          message: '인덱싱 요청이 성공적으로 처리되었습니다.',
        }
      }

      // 성공 로그 기록
      await this.jobLogsService.create({
        jobId: job.jobId.toString(),
        message: `Naver 인덱싱 성공: ${url}`,
        level: 'info',
      })

      return {
        success: true,
        message: '인덱싱 요청이 성공적으로 처리되었습니다.',
      }
    } catch (error) {
      this.logger.error(`Naver 색인 요청 실패: ${error.message}`, error.stack)

      const job = await this.prisma.indexJob.findFirst({
        where: {
          url,
          provider: 'NAVER',
        },
      })

      if (job) {
        // 실패 로그 기록
        await this.jobLogsService.create({
          jobId: job.jobId.toString(),
          message: `Naver 인덱싱 실패: ${error.message}`,
          level: 'error',
        })
      } else {
        this.logger.warn(`작업 로그를 생성할 수 없습니다. 작업을 찾을 수 없습니다: ${url}`)
      }

      return {
        success: false,
        message: `인덱싱 요청 실패: ${error.message}`,
      }
    }
  }

  // TODO: 전역 설정 기반 indexUrls는 deprecated됨 - 사이트별 설정으로 대체
  // async indexUrls(urls: string[]): Promise<any> {
  //   // 이 함수는 전역 설정을 사용하는 레거시 함수입니다.
  //   // 새로운 구조에서는 manualIndexing을 siteId와 함께 사용하세요.
  //   throw new NaverAuthError('indexUrls는 deprecated됨. manualIndexing을 사용하세요.', 'indexUrls')
  // }
}

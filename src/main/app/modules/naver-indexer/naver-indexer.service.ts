import fs from 'node:fs'
import path from 'node:path'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { NaverAccountService } from '../naver-account/naver-account.service'
import { sleep } from '@main/app/utils/sleep'
import { Browser, chromium, Page } from 'playwright'
import { CustomHttpException } from '@main/common/errors/custom-http.exception'
import { ErrorCode } from '@main/common/errors/error-code.enum'

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

  constructor(
    private readonly siteConfigService: SiteConfigService,
    private readonly naverAccountService: NaverAccountService,
  ) {}

  async onModuleInit() {}

  private async getNaverConfig(siteId: number) {
    try {
      const siteConfig = await this.siteConfigService.getSiteConfig(siteId)
      if (!siteConfig) {
        throw new CustomHttpException(ErrorCode.NAVER_ACCOUNT_NOT_FOUND, { siteId, exists: false })
      }

      if (!siteConfig.naverConfig || !siteConfig.naverConfig.use) {
        throw new CustomHttpException(ErrorCode.NAVER_CONFIG_DISABLED, { siteId, naverConfigEnabled: false })
      }

      const naverAccountId = siteConfig.naverConfig.selectedNaverAccountId
      if (!naverAccountId) {
        throw new CustomHttpException(ErrorCode.NAVER_ACCOUNT_NOT_SELECTED, { siteId, hasSelectedAccount: false })
      }

      const account = await this.naverAccountService.getAccountById(naverAccountId)
      if (!account) {
        throw new CustomHttpException(ErrorCode.NAVER_ACCOUNT_NOT_FOUND, {
          siteId,
          accountId: naverAccountId,
          exists: false,
        })
      }

      if (!account.isActive) {
        throw new CustomHttpException(ErrorCode.NAVER_ACCOUNT_INACTIVE, {
          siteId,
          accountId: naverAccountId,
          naverId: account.naverId,
          isActive: false,
        })
      }

      return {
        naverId: account.naverId,
        password: account.password,
        headless: siteConfig.naverConfig.headless ?? true,
      }
    } catch (error) {
      if (error instanceof CustomHttpException) {
        throw error
      }
      throw new CustomHttpException(ErrorCode.NAVER_UNKNOWN_ERROR, { siteId, errorMessage: error.message })
    }
  }

  /**
   * Playwright용 쿠키 복원
   */
  private async loadCookies(page: Page, naverId?: string): Promise<boolean> {
    const cookiePath = getNaverCookiePath(naverId)
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await page.context().addCookies(cookies)
      this.logger.log('쿠키를 불러와 세션을 복원합니다.')
      return true
    } else {
      this.logger.warn('쿠키 파일이 존재하지 않습니다. 먼저 수동으로 로그인 후 쿠키를 저장해 주세요.')
      return false
    }
  }

  /**
   * Playwright용 쿠키 저장
   */
  private async saveCookies(page: Page, naverId?: string) {
    const cookiePath = getNaverCookiePath(naverId)
    const cookies = await page.context().cookies()
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8')
    this.logger.log('쿠키를 저장했습니다.')
  }

  /**
   * 네이버 로그인 시도 (쿠키가 없을 때)
   */
  private async tryLoginAndSaveCookies(page: Page, naverId: string, password: string): Promise<boolean> {
    try {
      await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#id', { timeout: 10000 })
      await page.fill('#id', naverId)
      await page.waitForSelector('#pw', { timeout: 10000 })
      await page.fill('#pw', password)
      // 로그인 버튼 클릭 및 네비게이션 대기
      await Promise.all([
        page.waitForURL('https://www.naver.com', { waitUntil: 'networkidle' }),
        page.click('button[type="submit"]'),
      ])
      // 로그인 성공 여부 확인 (네이버 메인/서치어드바이저로 이동했는지)
      if (!page.url().includes('nid.naver.com')) {
        await this.saveCookies(page, naverId)
        this.logger.log('네이버 로그인 성공 및 쿠키 저장 완료')
        return true
      } else {
        this.logger.warn('네이버 로그인 실패: 로그인 페이지에 머무름')
        return false
      }
    } catch (e) {
      this.logger.error('네이버 로그인 자동화 실패:', e)
      return false
    }
  }

  async submitUrl(siteId: number, url: string): Promise<{ success: boolean; message: string }> {
    const siteConfig = await this.siteConfigService.getSiteConfig(siteId)
    if (!siteConfig) {
      throw new CustomHttpException(ErrorCode.NAVER_ACCOUNT_NOT_FOUND, { siteId })
    }
    const dbConfig = await this.getNaverConfig(siteId)
    const naverId = dbConfig.naverId
    const naverPw = dbConfig.password
    const useHeadless = false
    const browser: Browser = await chromium.launch({
      headless: useHeadless,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    })
    const page: Page = await browser.newPage()
    let hasCookie = await this.loadCookies(page, naverId)
    if (!hasCookie) {
      this.logger.log('쿠키가 없어 네이버 로그인을 시도합니다...')
      const loginSuccess = await this.tryLoginAndSaveCookies(page, naverId, naverPw)
      if (!loginSuccess) {
        await browser.close()
        throw new CustomHttpException(ErrorCode.NAVER_AUTH_FAIL, {
          siteId,
          naverId,
          errorMessage: '쿠키 파일이 없고, 자동 로그인에도 실패했습니다.',
        })
      }
    }
    await page.goto(`https://searchadvisor.naver.com/console/site/request/crawl?site=${siteConfig.siteUrl}`)
    await sleep(2000)
    if (page.url().includes('nid.naver.com')) {
      await browser.close()
      throw new CustomHttpException(ErrorCode.NAVER_AUTH_FAIL, {
        siteId,
        naverId,
        errorMessage: '네이버 로그인이 필요합니다. 쿠키가 만료되었거나 존재하지 않습니다.',
      })
    }
    // 인덱싱 입력창에 url 입력 및 확인 버튼 클릭
    const inputSelector = 'input[type="text"][maxlength="2048"]'
    await page.waitForSelector(inputSelector, { timeout: 10000 })
    await page.fill(inputSelector, url)
    // 확인 버튼 클릭
    const buttons = await page.$$('button')
    for (const btn of buttons) {
      const text = await btn.textContent()
      if (text && text.trim() === '확인') {
        await btn.click()
        break
      }
    }
    // 결과 대기 및 확인
    let dialogAppeared = false
    let dialogMsg = ''
    page.on('dialog', async dialog => {
      dialogAppeared = true
      dialogMsg = dialog.message()
      await dialog.dismiss()
    })
    await sleep(1000)
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
      await sleep(pollInterval)
    }
    await browser.close()
    if (dialogAppeared) {
      return { success: false, message: dialogMsg || '이미 요청된 URL' }
    }
    if (isSuccess) {
      return { success: true, message: '색인 요청 성공' }
    } else {
      return { success: false, message: '색인 요청 실패 또는 테이블에 20초 내 반영되지 않음' }
    }
  }

  // TODO: 전역 설정 기반 indexUrls는 deprecated됨 - 사이트별 설정으로 대체
  // async indexUrls(urls: string[]): Promise<any> {
  //   // 이 함수는 전역 설정을 사용하는 레거시 함수입니다.
  //   // 새로운 구조에서는 manualIndexing을 siteId와 함께 사용하세요.
  //   throw new NaverAuthError('indexUrls는 deprecated됨. manualIndexing을 사용하세요.', 'indexUrls')
  // }
}

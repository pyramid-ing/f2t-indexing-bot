import fs from 'node:fs'
import path from 'node:path'
import { SiteConfigService } from '@main/app/modules/site-config/site-config.service'
import { sleep } from '@main/app/utils/sleep'
import { DaumConfigError } from '@main/filters/error.types'
import { Injectable, Logger } from '@nestjs/common'
import { chromium, Browser, Page } from 'playwright'

export interface DaumIndexerOptions {
  urlsToIndex: string[]
  siteId?: number // siteId 추가 (사이트별 설정 우선 사용)
  siteUrl?: string // 옵션으로 변경
  pin?: string // 옵션으로 변경: DB에서 가져올 수 있음
}

@Injectable()
export class DaumIndexerService {
  private readonly logger = new Logger(DaumIndexerService.name)

  constructor(private readonly siteConfigService: SiteConfigService) {}

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

  async submitUrl(siteId: number, url: string): Promise<{ success: boolean; message: string }> {
    // Playwright로 headless: false 브라우저 띄워서 Daum 웹마스터에 직접 인덱싱 요청
    const siteConfig = await this.siteConfigService.getSiteConfig(siteId)
    if (!siteConfig || !siteConfig.daumConfig) {
      throw new Error('사이트 또는 Daum 설정을 찾을 수 없습니다.')
    }
    const daumSiteUrl = siteConfig.daumConfig.siteUrl
    const pin = siteConfig.daumConfig.password
    const useHeadless = false
    const browser: Browser = await chromium.launch({ headless: useHeadless })
    const page: Page = await browser.newPage()
    // 쿠키 불러오기 (playwright 방식)
    const cookiePath = this.getDaumCookiePath(daumSiteUrl)
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await page.context().addCookies(cookies)
      this.logger.log('쿠키를 불러와 세션을 복원합니다.')
    }
    await page.goto('https://webmaster.daum.net/tool/collect')
    await sleep(1000)
    let loggedIn = false
    // 로그인 폼 감지 및 로그인 시도
    const isLoginPage = await page.$('form.form_register input#authSiteUrl')
    if (isLoginPage) {
      if (!daumSiteUrl || !pin) {
        await browser.close()
        throw new Error('로그인 필요: siteUrl, pin 값을 설정하거나 입력하세요.')
      }
      await page.fill('#authSiteUrl', daumSiteUrl)
      await page.fill('#authPinCode', pin)
      await page.click('button.btn_register')
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 })
      // 로그인 실패 확인
      if ((await page.url()).startsWith('https://webmaster.daum.net/login')) {
        await browser.close()
        throw new Error('Daum 로그인 실패: URL 또는 PIN 코드가 올바르지 않습니다.')
      }
      this.logger.log('다음 로그인 완료')
      if ((await page.url()).includes('/dashboard')) {
        await page.goto('https://webmaster.daum.net/tool/collect', { waitUntil: 'networkidle' })
        await sleep(2000)
      }
      // 쿠키 저장
      const cookies = await page.context().cookies()
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), 'utf-8')
      this.logger.log('쿠키를 저장했습니다.')
      loggedIn = true
    } else {
      this.logger.warn('로그인 폼이 감지되지 않음, 이미 로그인된 상태일 수 있음')
      loggedIn = true
    }
    // 인덱싱 요청
    await page.waitForSelector('#collectReqUrl', { timeout: 10000 })
    await page.evaluate(() => {
      const input = document.querySelector('#collectReqUrl') as HTMLInputElement
      if (input) input.value = ''
    })
    await page.fill('#collectReqUrl', url)
    await page.click('.btn_result')
    let isSuccess = false
    let msg = ''
    let errorFromDesc = ''
    const timeoutMs = 10000
    const pollInterval = 300
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      // 성공 레이어 확인
      isSuccess = await page.evaluate(() => {
        const layer = document.querySelector('.webmaster_layer.layer_collect')
        return layer && !layer.classList.contains('hide')
      })
      // 에러 메시지 확인 (.desc 클래스에서 추출)
      if (!isSuccess) {
        errorFromDesc = await page.evaluate(() => {
          const descElement = document.querySelector('p.desc')
          return descElement ? descElement.textContent?.trim() || '' : ''
        })
      }
      if (isSuccess || errorFromDesc) break
      await sleep(pollInterval)
    }
    if (isSuccess) {
      msg = '수집요청 완료'
      await page.click('.btn_confirm')
      await sleep(500)
      await browser.close()
      return { success: true, message: msg }
    } else {
      msg = errorFromDesc || '수집요청 실패 또는 레이어 미노출'
      await browser.close()
      return { success: false, message: msg }
    }
  }
}

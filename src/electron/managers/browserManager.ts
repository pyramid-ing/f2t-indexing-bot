import { CONSTANTS } from '../constants'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { AppState } from './AppState'
import { utils } from '../utils'
// Stealth 플러그인 추가
puppeteer.use(StealthPlugin())

const commonArgs = ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']

export const browserManager = {
  async launchBrowser(): Promise<boolean> {
    const state = AppState.getInstance()
    // 자동화 브라우저가 있으면 종료
    if (state.browser) {
      try {
        await state.browser.close()
      } catch (e) {}
      state.browser = null
      state.page = null
    }
    // naverLoginBrowser가 있으면 종료 (userDataDir 충돌 방지)
    if (state.naverLoginBrowser) {
      try {
        await state.naverLoginBrowser.close()
      } catch (e) {}
      state.naverLoginBrowser = null
      state.naverLoginPage = null
    }
    try {
      utils.sendLogToRenderer('🌐 브라우저 시작 중...')
      const userDataDir = CONSTANTS.USER_DATA_DIR
      state.browser = await puppeteer.launch({
        headless: false,
        executablePath: CONSTANTS.CHROME_PATH,
        userDataDir,
        args: commonArgs,
      })
      state.page = await state.browser.newPage()
      utils.sendLogToRenderer('✅ 브라우저 시작 완료')
      return true
    } catch (err) {
      utils.sendLogToRenderer(`❌ 브라우저 시작 실패: ${err}`, 'error')
      return false
    }
  },

  async launchNaverLoginBrowser(): Promise<boolean> {
    const state = AppState.getInstance()

    // 자동화 브라우저가 있으면 종료
    if (state.browser) {
      try {
        await state.browser.close()
      } catch (e) {}
      state.browser = null
      state.page = null
    }
    // 네이버 로그인 브라우저가 있으면 종료
    if (state.naverLoginBrowser) {
      try {
        await state.naverLoginBrowser.close()
      } catch (e) {}
      state.naverLoginBrowser = null
      state.naverLoginPage = null
    }
    const userDataDir = CONSTANTS.USER_DATA_DIR
    let browser
    try {
      browser = await puppeteer.launch({
        headless: false,
        executablePath: CONSTANTS.CHROME_PATH,
        userDataDir,
        args: commonArgs,
      })
      const page = await browser.newPage()
      state.naverLoginBrowser = browser
      state.naverLoginPage = page
      await page.goto(CONSTANTS.LOGIN_URL, { waitUntil: 'networkidle2' })
      // 로그인 성공 감지: 네이버 메인 등으로 이동하면 자동 종료
      try {
        await page.waitForFunction(
          () => location.hostname === 'www.naver.com',
          { timeout: 180000 }, // 3분 대기
        )
        await utils.delay(5000)
        await browser.close()
        state.naverLoginBrowser = null
        state.naverLoginPage = null
        return true
      } catch (e) {
        // 타임아웃 등으로 로그인 성공 감지 못하면 기존 방식대로 대기
        await new Promise(resolve => {
          browser.on('disconnected', resolve)
        })
        state.naverLoginBrowser = null
        state.naverLoginPage = null
        return true
      }
    } catch (err) {
      console.error('네이버 로그인 브라우저 오류:', err)
      state.naverLoginBrowser = null
      state.naverLoginPage = null
      return false
    }
  },
  async ensureBrowserReady(): Promise<boolean> {
    const state = AppState.getInstance()
    if (!state.browser || !state.page) {
      const success = await this.launchBrowser()
      if (!success) {
        utils.sendLogToRenderer('❌ 브라우저 시작 실패', 'error')
        return false
      }
    }
    try {
      if (state.page) {
        await state.page.evaluate(() => document.readyState)
      }
      return true
    } catch (err) {
      utils.sendLogToRenderer('⚠️ 브라우저/페이지 재시작', 'error')
      state.reset()
      await this.launchBrowser()
      return false
    }
  },
}

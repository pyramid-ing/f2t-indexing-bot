import { solveImageCaptcha } from '../lib/2capcha'
import { aiManager } from './aiManager'
import { CONSTANTS } from '../constants'
import { utils } from '../utils'
import * as puppeteer from 'puppeteer-core'
import { Settings } from '../types'

export const capchaManager = {
  // 영수증(이미지) 캡차 처리
  async solveReceiptCaptcha(page: puppeteer.Page, settings: Settings): Promise<boolean> {
    await utils.delay(3000)
    const receiptCaptcha = await page.$('#captchaimg')
    if (receiptCaptcha) {
      // 이미지 스크린샷을 base64로 추출
      const base64Image = await receiptCaptcha.screenshot({ type: 'png', encoding: 'base64' })

      const questionElem = await page.$('.bill_message em')
      let questionText = ''
      if (questionElem) {
        questionText = await page.evaluate(el => el.textContent || '', questionElem)
      }
      utils.sendLogToRenderer(`🤖 AI에게 영수증 이미지와 질문("${questionText}")을 전송하여 해제 시도`)
      const captchaAnswer = await aiManager.generateNaverBillCaptchaAnswer(
        base64Image,
        settings.aiProvider,
        settings.apiKey,
        questionText,
      )
      if (captchaAnswer) {
        await page.type('#captcha', captchaAnswer, { delay: 50 })
        await page.click('a.c-button-default.popup__button_submit._captcha_layer_close')
        // 답변 제출 후 5초간 dialog(알림창) 감지: 실패 메시지 있으면 false 반환
        let failed = false
        const failMsg = '자동 등록 방지를 위한 문자를 잘못 입력하셨습니다.'
        const dialogHandler = async (dialog: puppeteer.Dialog) => {
          if (dialog.message().includes(failMsg)) {
            failed = true
          }
          await dialog.accept()
        }
        page.on('dialog', dialogHandler)
        await utils.delay(5000)
        page.off('dialog', dialogHandler)
        if (failed) {
          utils.sendLogToRenderer('❌ 캡차 입력 실패: 자동 등록 방지 문자를 잘못 입력함', 'error')
          return false
        }
        utils.sendLogToRenderer('✅ AI 영수증 캡차 해제 완료')
        await utils.delay(1000)
        utils.sendLogToRenderer(`✅ 최종 답변 등록 완료 (AI 영수증 캡차 후) 링크: ${page.url()}`)
        return true
      } else {
        utils.sendLogToRenderer('❌ AI 영수증 캡차 해제 실패', 'error')
        return false
      }
    }
    return false
  },

  // 일반 보안문자(2capcha) 처리
  async solveTextCaptcha(page: puppeteer.Page): Promise<boolean> {
    await utils.delay(3000)
    const captchaImg = await page.$('.popup__captcha_image img')
    if (captchaImg) {
      const buffer = (await captchaImg.screenshot()) as Buffer
      const base64Image = buffer.toString('base64')
      utils.sendLogToRenderer('🔑 2capcha API로 보안문자 해제 시도')
      const recognizedText = await solveImageCaptcha(CONSTANTS.TWO_CAPTCHA_API_KEY, base64Image)
      if (recognizedText) {
        await page.type('#input_captcha', recognizedText, { delay: 50 })
        await page.click('a.c-button-default._captcha_layer_close')
        utils.sendLogToRenderer('✅ 2capcha 보안문자 해제 완료')
        await utils.delay(1000)
        await page.click('#answerRegisterButton')
        utils.sendLogToRenderer(`✅ 최종 답변 등록 완료 (2capcha 보안문자 후) 링크: ${page.url()}`)
        return true
      } else {
        utils.sendLogToRenderer('❌ 2capcha 보안문자 해제 실패', 'error')
        return false
      }
    } else {
      utils.sendLogToRenderer('❌ 캡차 이미지 노드 탐색 실패', 'error')
      return false
    }
  },

  // 최대 3회까지 영수증(이미지) 캡차 재시도 래퍼
  async solveReceiptCaptchaWithRetry(page: puppeteer.Page, settings: Settings): Promise<boolean> {
    const MAX_RETRY = 3
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      const success = await capchaManager.solveReceiptCaptcha(page, settings)
      if (success) return true
    }
    return false
  },
}

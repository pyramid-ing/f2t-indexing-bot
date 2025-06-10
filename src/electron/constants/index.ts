import * as fs from 'fs'
import path from 'path'
import { app } from 'electron'

// Windows에서 가능한 Chrome 경로들
const windowsChromePaths = [
  `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.PROGRAMFILES} (x86)\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

// OS별 Chrome 경로 설정
const getChromeExecutablePath = (): string => {
  if (process.platform === 'darwin') {
    // macOS
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  } else if (process.platform === 'win32') {
    // Windows - 존재하는 첫 번째 경로 사용
    const existingPath = windowsChromePaths.find(path => fs.existsSync(path))
    if (!existingPath) {
      throw new Error('Chrome이 설치되어 있지 않습니다. Chrome을 설치해주세요.')
    }
    return existingPath
  } else {
    // Linux
    return '/usr/bin/google-chrome'
  }
}

export const CONSTANTS = {
  TWO_CAPTCHA_API_KEY: 'ef98479375f0b2fa31a00fd984f8fd8c',
  CHROME_PATH: getChromeExecutablePath(),
  KIN_URL: 'https://kin.naver.com/qna/list.naver?view=card',
  LOGIN_URL: 'https://nid.naver.com/nidlogin.login',
  USER_DATA_DIR: path.join(app.getPath('userData'), 'custom-user-data-dir'),
} as const

import { BrowserWindow } from 'electron'
import * as puppeteer from 'puppeteer-core'
import { AppState as IAppState } from '../types'

export class AppState implements IAppState {
  private static instance: AppState
  monitoring: boolean = false
  browser: puppeteer.Browser | null = null
  page: puppeteer.Page | null = null
  naverLoginBrowser: puppeteer.Browser | null = null
  naverLoginPage: puppeteer.Page | null = null
  mainWindow: BrowserWindow | null = null

  private constructor() {}

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  reset() {
    this.monitoring = false
    this.browser = null
    this.page = null
    this.naverLoginBrowser = null
    this.naverLoginPage = null
  }
}

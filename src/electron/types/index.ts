import { BrowserWindow } from 'electron'
import * as puppeteer from 'puppeteer-core'

export interface Post {
  id: number
  title: string
  content: string
  link: string
  matchedKeywords: string[]
  aiReply?: string
  status: 'pending' | 'completed' | 'failed'
}

export interface Settings {
  id: number
  keywords: string[]
  intervalSec: number
  useAi: boolean
  aiProvider: 'openai' | 'claude'
  apiKey: string
  header: string
  footer: string
  answerMode: 'auto' | 'manual'
  hideBrowser: boolean
}

export interface Auth {
  id: number
  email: string
  token: string
}

export interface AppState {
  monitoring: boolean
  browser: puppeteer.Browser | null
  page: puppeteer.Page | null
  naverLoginBrowser: puppeteer.Browser | null
  naverLoginPage: puppeteer.Page | null
  mainWindow: BrowserWindow | null
  reset(): void
}

export interface LoginResponse {
  message: string
  success: boolean
  token: string
  email: string
}

export interface LoginCheckResponse {
  login: boolean
  message: string
}

export type PostInput = {
  title: string
  content: string
  link: string
  matchedKeywords: string[]
  aiReply?: string
  status?: 'pending' | 'completed' | 'failed'
}

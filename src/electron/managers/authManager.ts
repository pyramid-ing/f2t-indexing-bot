import axios from 'axios'
import { getAuth, saveAuth, clearAuth } from '../repository/authRepository'
import { utils } from '../utils'

const API_BASE = 'https://n8n.pyramid-ing.com/webhook/prd'

type LoginResponse = {
  success: boolean
  message: string
  token: string
  email: string
}

type LoginCheckResponse = {
  login: boolean
  message: string
}

export const authManager = {
  async loadAuth() {
    return getAuth()
  },
  async saveAuth(email: string, token: string) {
    return saveAuth(email, token)
  },
  async clearAuth() {
    return clearAuth()
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(`${API_BASE}/signin`, {
        email,
        password,
      })
      if (response.data.success) {
        await this.saveAuth(response.data.email, response.data.token)
      }
      return {
        ...response.data,
        email,
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || '로그인 실패',
        token: '',
        email,
      }
    }
  },

  async checkLoginStatus(email: string, token: string): Promise<LoginCheckResponse> {
    try {
      const response = await axios.post<LoginCheckResponse>(`${API_BASE}/check-login`, {
        email,
        token,
      })
      return response.data
    } catch (err: any) {
      return {
        login: false,
        message: err.response?.data?.message || '인증 확인 실패',
      }
    }
  },
  async checkAuthStatus(): Promise<boolean> {
    try {
      const auth = await this.loadAuth()
      if (!auth || !auth.token) {
        utils.sendLogToRenderer('⚠️ 로그인이 필요합니다.', 'error')
        return false
      }
      const loginStatus = await this.checkLoginStatus(auth.email, auth.token)
      if (!loginStatus.login) {
        utils.sendLogToRenderer(`⚠️ ${loginStatus.message}`, 'error')
        return false
      }
      await this.saveAuth(auth.email, auth.token)
      return true
    } catch (err) {
      utils.sendLogToRenderer('❌ 로그인 상태 확인 중 오류 발생', 'error')
      return false
    }
  },
}

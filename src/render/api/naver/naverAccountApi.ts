import { api } from '../api'
import { NaverAccount } from '../types'

const BASE_PATH = '/naver-accounts'

export const naverAccountApi = {
  getAll: async (): Promise<NaverAccount[]> => {
    const response = await api.get(BASE_PATH)
    return response.data
  },

  create: async (data: Omit<NaverAccount, 'id'>): Promise<NaverAccount> => {
    const response = await api.post(BASE_PATH, data)
    return response.data
  },

  update: async (id: string, data: Partial<NaverAccount>): Promise<NaverAccount> => {
    const response = await api.put(`${BASE_PATH}/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`)
  },

  checkLoginStatus: async (naverId?: string): Promise<boolean> => {
    const response = await api.get(`${BASE_PATH}/login-status/${naverId}`)
    return response.data
  },

  openLoginBrowser: async (naverId?: string): Promise<void> => {
    await api.post(`${BASE_PATH}/login/${naverId}`)
  },

  checkLoginComplete: async (naverId?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.get(`${BASE_PATH}/login-complete/${naverId}`)
    return response.data
  },

  updateLoginStatus: async (naverId: string, isLoggedIn: boolean, lastLogin?: string): Promise<void> => {
    await api.put(`${BASE_PATH}/${naverId}/login-status`, {
      isLoggedIn,
      lastLogin,
    })
  },

  getAllAccounts: async (): Promise<NaverAccount[]> => {
    const response = await api.get(BASE_PATH)
    return response.data
  },

  getActiveAccounts: async (): Promise<NaverAccount[]> => {
    const response = await api.get(`${BASE_PATH}/active`)
    return response.data
  },

  getByNaverId: async (naverId: string): Promise<NaverAccount | null> => {
    try {
      const response = await api.get(`${BASE_PATH}/by-naver-id/${naverId}`)
      return response.data
    } catch (error) {
      if (error?.status === 404) {
        return null
      }
      throw error
    }
  },
}

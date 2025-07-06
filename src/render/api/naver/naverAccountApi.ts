import { api } from '../api'

export interface NaverAccount {
  id: number
  naverId: string
  password: string
  name: string
  isActive: boolean
  isLoggedIn: boolean
  lastLogin: string
  createdAt: string
  updatedAt: string
}

export type CreateNaverAccountDto = Omit<NaverAccount, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'isLoggedIn'>

const naverAccountApi = {
  getAll: () => api.get<NaverAccount[]>('/naver-accounts'),
  create: (data: CreateNaverAccountDto) => api.post<NaverAccount>('/naver-accounts', data),
  update: (id: number, data: Partial<NaverAccount>) => api.patch<NaverAccount>(`/naver-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/naver-accounts/${id}`),
}

export { naverAccountApi }

import { api } from '../api'
import { NaverAccount } from '../types'

export type { NaverAccount }
export type CreateNaverAccountDto = Pick<NaverAccount, 'name' | 'naverId' | 'password'> & { isActive?: boolean }

const naverAccountApi = {
  getAll: () => api.get<NaverAccount[]>('/naver-accounts'),
  create: (data: CreateNaverAccountDto) => api.post<NaverAccount>('/naver-accounts', data),
  update: (id: number, data: Partial<NaverAccount>) => api.patch<NaverAccount>(`/naver-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/naver-accounts/${id}`),
}

export { naverAccountApi }

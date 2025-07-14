import axios from 'axios'
import { getErrorMessage } from './types'

// API 응답 타입을 재정의
declare module 'axios' {
  export interface AxiosInstance {
    get<T = any>(url: string, config?: any): Promise<T>
    post<T = any>(url: string, data?: any, config?: any): Promise<T>
    patch<T = any>(url: string, data?: any, config?: any): Promise<T>
    delete<T = any>(url: string, config?: any): Promise<T>
  }
}

export const api = axios.create({
  baseURL: 'http://localhost:3553',
})

// 응답 인터셉터 추가
api.interceptors.response.use(
  response => {
    // 성공 응답은 data만 반환
    return response.data
  },
  error => {
    // 에러 응답은 에러 메시지를 포함하여 reject
    return Promise.reject({
      message: getErrorMessage(error),
      ...error,
    })
  },
)

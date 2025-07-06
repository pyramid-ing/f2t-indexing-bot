import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3553',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 응답 인터셉터 추가
api.interceptors.response.use(
  response => response.data,
  error => {
    // 에러 응답이 있는 경우
    if (error.response) {
      return Promise.reject(error.response.data)
    }
    // 네트워크 에러 등의 경우
    return Promise.reject(error)
  },
)

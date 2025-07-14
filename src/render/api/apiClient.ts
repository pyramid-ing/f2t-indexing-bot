import axios from 'axios'
import { errorNormalizer } from './errorHelpers'

const API_BASE_URL = 'http://localhost:3553'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  r => r,
  e => {
    return Promise.reject(errorNormalizer(e))
  },
)

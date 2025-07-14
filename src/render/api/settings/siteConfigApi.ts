import { api } from '../api'

const BASE_PATH = '/sites'

// 검색엔진별 설정 인터페이스
export interface GoogleConfig {
  use: boolean
  serviceAccountJson?: string
}

export interface BingConfig {
  use: boolean
  apiKey?: string
}

export interface NaverConfig {
  use: boolean
  selectedNaverAccountId?: number
  loginUrl?: string
  headless?: boolean
}

export interface DaumConfig {
  use: boolean
  siteUrl?: string
  password?: string
  loginUrl?: string
  headless?: boolean
}

// 사이트 설정 관련
export interface SiteConfig {
  id?: number
  domain: string
  name: string
  siteUrl: string
  isActive?: boolean
  googleConfig?: GoogleConfig
  naverConfig?: NaverConfig
  daumConfig?: DaumConfig
  bingConfig?: BingConfig
  createdAt?: string
  updatedAt?: string
}

export interface Site {
  id: number
  name: string
  domain: string
  siteUrl: string
  isActive: boolean
  naverConfig: {
    use: boolean
    selectedNaverAccountId?: number
    loginUrl?: string
    headless?: boolean
  }
  daumConfig: {
    use: boolean
    siteUrl?: string
    loginUrl?: string
    password?: string
    headless?: boolean
  }
  googleConfig: {
    use: boolean
    serviceAccountJson?: string
  }
  bingConfig: {
    use: boolean
    apiKey?: string
  }
}

// 사이트 설정 관리 API
export const siteConfigApi = {
  getAll: () => api.get<Site[]>('/sites'),
  getById: (id: number) => api.get<Site>(`${BASE_PATH}/${id}`),
  create: (data: Omit<Site, 'id'>) => api.post<Site>('/sites', data),
  update: (id: number, data: Partial<Site>) => api.put<Site>(`/sites/${id}`, data),
  delete: (id: number) => api.delete(`/sites/${id}`),
  getByDomain: (domain: string) => api.get<Site>(`${BASE_PATH}/domain/${encodeURIComponent(domain)}`),
  getActive: () => api.get<Site[]>(`${BASE_PATH}/active`),
  findByUrl: async (url: string): Promise<SiteConfig | null> => {
    const domain = new URL(url).hostname
    try {
      return await api.get<SiteConfig>(`${BASE_PATH}/domain/${encodeURIComponent(domain)}`)
    } catch (error) {
      if (error?.status === 404) {
        return null
      }
      throw error
    }
  },
}

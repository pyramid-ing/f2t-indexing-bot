import { api } from '../api'

const BASE_PATH = '/sites'

// 검색엔진별 설정 인터페이스
export interface GoogleConfig {
  use: boolean
  serviceAccountJson: string
}

export interface BingConfig {
  use: boolean
  apiKey: string
}

export interface NaverConfig {
  use: boolean
  selectedNaverAccountId?: number
  loginUrl: string
  headless?: boolean
}

export interface DaumConfig {
  use: boolean
  siteUrl: string
  password: string
  loginUrl: string
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
  bingConfig: {
    use: boolean
  }
  daumConfig: {
    use: boolean
  }
  googleConfig: {
    use: boolean
  }
  naverConfig: {
    use: boolean
    selectedNaverAccountId?: string
  }
  indexingConfig: {
    use: boolean
    schedule: string
  }
}

// 사이트 설정 관리 API
export const siteConfigApi = {
  getAll: async (): Promise<Site[]> => {
    const response = await api.get(BASE_PATH)
    return response.data
  },

  getById: async (id: number): Promise<Site> => {
    const response = await api.get(`${BASE_PATH}/${id}`)
    return response.data
  },

  create: async (data: Omit<Site, 'id'>): Promise<Site> => {
    const response = await api.post(BASE_PATH, data)
    return response.data
  },

  update: async (id: number, data: Partial<Site>): Promise<Site> => {
    const response = await api.put(`${BASE_PATH}/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE_PATH}/${id}`)
  },

  getByDomain: async (domain: string): Promise<Site> => {
    const response = await api.get(`${BASE_PATH}/domain/${encodeURIComponent(domain)}`)
    return response.data
  },

  getActive: async (): Promise<Site[]> => {
    const response = await api.get(`${BASE_PATH}/active`)
    return response.data
  },

  findByUrl: async (url: string): Promise<SiteConfig | null> => {
    const domain = new URL(url).hostname
    try {
      const response = await api.get(`${BASE_PATH}/domain/${encodeURIComponent(domain)}`)
      return response.data
    } catch (error) {
      if (error?.status === 404) {
        return null
      }
      throw error
    }
  },
}

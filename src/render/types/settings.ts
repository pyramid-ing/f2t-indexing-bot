// 일반 설정 타입
export interface AppSettings {
  appVersion: string
  initialized: boolean
  setupCompleted: boolean
  theme: 'light' | 'dark'
  language: 'ko' | 'en'
  firstRun: boolean
}

// 인덱싱 설정 타입
export interface IndexingSettings {
  defaultDelay: number
  maxRetries: number
  batchSize: number
  enableLogging: boolean
}

// 검색엔진별 설정 타입
export interface GoogleEngineSettings {
  use: boolean
  serviceAccountJson: string
  oauth2ClientId: string
  oauth2ClientSecret: string
  oauth2AccessToken: string
  oauth2RefreshToken: string
  oauth2TokenExpiry: string
}

export interface BingEngineSettings {
  use: boolean
  apiKey: string
}

export interface NaverEngineSettings {
  use: boolean
  naverId: string
  password: string
  headless: boolean
}

export interface DaumEngineSettings {
  use: boolean
  siteUrl: string
  password: string
  headless: boolean
}

// 전체 엔진 설정 타입
export interface GlobalEngineSettings {
  google: GoogleEngineSettings
  bing: BingEngineSettings
  naver: NaverEngineSettings
  daum: DaumEngineSettings
}

// 설정 컴포넌트 공통 Props 타입
export interface SettingsComponentProps<T> {
  settings: T
  onSave: (values: Partial<T>) => Promise<void>
  loading: boolean
}

export interface EngineSettingsComponentProps<T> extends SettingsComponentProps<T> {
  onToggleUse: (checked: boolean) => Promise<void>
}

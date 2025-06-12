import React, { useState, useEffect } from 'react'
import { Card, message, Typography, Tabs } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import {
  getGlobalSettings,
  updateGlobalGoogleSettings,
  updateGlobalBingSettings,
  updateGlobalNaverSettings,
  updateGlobalDaumSettings,
} from '../api'
import { AppSettings, IndexingSettings, GlobalEngineSettings } from '../types/settings'
import GeneralSettings from '../components/settings/GeneralSettings'
import DaumSettings from '../components/settings/DaumSettings'
import NaverSettings from '../components/settings/NaverSettings'
import BingSettings from '../components/settings/BingSettings'
import GoogleSettings from '../components/settings/GoogleSettings'
import IndexingSettingsComponent from '../components/settings/IndexingSettings'

const { Title } = Typography
const { TabPane } = Tabs

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // 각 설정별 state
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appVersion: '1.0.0',
    initialized: true,
    setupCompleted: true,
    theme: 'light',
    language: 'ko',
    firstRun: false,
  })

  const [indexingSettings, setIndexingSettings] = useState<IndexingSettings>({
    defaultDelay: 2000,
    maxRetries: 3,
    batchSize: 10,
    enableLogging: true,
  })

  const [engineSettings, setEngineSettings] = useState<GlobalEngineSettings>({
    google: {
      use: false,
      serviceAccountEmail: '',
      privateKey: '',
      oauth2ClientId: '',
      oauth2ClientSecret: '',
      oauth2AccessToken: '',
      oauth2RefreshToken: '',
      oauth2TokenExpiry: '',
    },
    bing: {
      use: false,
      apiKey: '',
    },
    naver: {
      use: false,
      naverId: '',
      password: '',
      headless: true,
    },
    daum: {
      use: false,
      siteUrl: '',
      password: '',
      headless: true,
    },
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)

      // 앱 상태 로드
      const response = await fetch('http://localhost:3030/settings/status')
      const responseData = await response.json()
      const data = responseData.data || responseData

      if (data) {
        const settings: AppSettings = {
          appVersion: data.appVersion || '1.0.0',
          initialized: data.initialized || true,
          setupCompleted: data.setupCompleted || true,
          theme: 'light',
          language: 'ko',
          firstRun: data.firstRun || false,
        }
        setAppSettings(settings)
      }

      // 전역 엔진 설정 로드
      try {
        const engineResponse = await getGlobalSettings()
        if (engineResponse.success && engineResponse.data) {
          setEngineSettings(engineResponse.data)
        }
      } catch (engineError) {
        console.log('전역 엔진 설정 로드 실패 (첫 실행일 수 있음):', engineError)
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 일반 설정 저장
  const saveAppSettings = async (values: AppSettings) => {
    setLoading(true)
    try {
      setAppSettings(values)
      // 실제 저장 API 호출이 필요하면 여기에 추가
    } finally {
      setLoading(false)
    }
  }

  // 인덱싱 설정 저장
  const saveIndexingSettings = async (values: IndexingSettings) => {
    setLoading(true)
    try {
      setIndexingSettings(values)
      // 실제 저장 API 호출이 필요하면 여기에 추가
    } finally {
      setLoading(false)
    }
  }

  // Google 설정 저장
  const saveGoogleSettings = async (values: Partial<GlobalEngineSettings['google']>) => {
    setLoading(true)
    try {
      await updateGlobalGoogleSettings(values)
      setEngineSettings(prev => ({
        ...prev,
        google: { ...prev.google, ...values },
      }))
    } finally {
      setLoading(false)
    }
  }

  // Google 사용 토글
  const toggleGoogleUse = async (checked: boolean) => {
    await saveGoogleSettings({ use: checked })
  }

  // Bing 설정 저장
  const saveBingSettings = async (values: Partial<GlobalEngineSettings['bing']>) => {
    setLoading(true)
    try {
      await updateGlobalBingSettings(values)
      setEngineSettings(prev => ({
        ...prev,
        bing: { ...prev.bing, ...values },
      }))
    } finally {
      setLoading(false)
    }
  }

  // Bing 사용 토글
  const toggleBingUse = async (checked: boolean) => {
    await saveBingSettings({ use: checked })
  }

  // Naver 설정 저장
  const saveNaverSettings = async (values: Partial<GlobalEngineSettings['naver']>) => {
    setLoading(true)
    try {
      await updateGlobalNaverSettings(values)
      setEngineSettings(prev => ({
        ...prev,
        naver: { ...prev.naver, ...values },
      }))
    } finally {
      setLoading(false)
    }
  }

  // Naver 사용 토글
  const toggleNaverUse = async (checked: boolean) => {
    await saveNaverSettings({ use: checked })
  }

  // Daum 설정 저장
  const saveDaumSettings = async (values: Partial<GlobalEngineSettings['daum']>) => {
    setLoading(true)
    try {
      await updateGlobalDaumSettings(values)
      setEngineSettings(prev => ({
        ...prev,
        daum: { ...prev.daum, ...values },
      }))
    } finally {
      setLoading(false)
    }
  }

  // Daum 사용 토글
  const toggleDaumUse = async (checked: boolean) => {
    await saveDaumSettings({ use: checked })
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: 8 }} />
          설정
        </Title>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large">
          <TabPane tab="일반 설정" key="general">
            <GeneralSettings settings={appSettings} onSave={saveAppSettings} loading={loading} />
          </TabPane>

          <TabPane tab="Google" key="google">
            <GoogleSettings
              settings={engineSettings.google}
              onSave={saveGoogleSettings}
              onToggleUse={toggleGoogleUse}
              loading={loading}
            />
          </TabPane>

          <TabPane tab="Bing" key="bing">
            <BingSettings
              settings={engineSettings.bing}
              onSave={saveBingSettings}
              onToggleUse={toggleBingUse}
              loading={loading}
            />
          </TabPane>

          <TabPane tab="네이버" key="naver">
            <NaverSettings
              settings={engineSettings.naver}
              onSave={saveNaverSettings}
              onToggleUse={toggleNaverUse}
              loading={loading}
            />
          </TabPane>

          <TabPane tab="다음" key="daum">
            <DaumSettings
              settings={engineSettings.daum}
              onSave={saveDaumSettings}
              onToggleUse={toggleDaumUse}
              loading={loading}
            />
          </TabPane>

          <TabPane tab="인덱싱 설정" key="indexing">
            <IndexingSettingsComponent settings={indexingSettings} onSave={saveIndexingSettings} loading={loading} />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings

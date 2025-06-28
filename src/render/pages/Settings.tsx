import type { GlobalEngineSettings } from '../types/settings'
import { SettingOutlined } from '@ant-design/icons'
import { Card, message, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import {
  getGlobalSettings,
  updateGlobalBingSettings,
  updateGlobalDaumSettings,
  updateGlobalGoogleSettings,
  updateGlobalNaverSettings,
} from '../api'
import BingSettings from '../components/settings/BingSettings'
import DaumSettings from '../components/settings/DaumSettings'
import GoogleSettings from '../components/settings/GoogleSettings'
import NaverSettings from '../components/settings/NaverSettings'
import SiteSettings from '../components/settings/SiteSettings'

const { Title } = Typography
const { TabPane } = Tabs

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('sites')

  const [engineSettings, setEngineSettings] = useState<GlobalEngineSettings>({
    google: {
      use: false,
      serviceAccountJson: '',
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

      // 전역 엔진 설정 로드
      try {
        const engineResponse = await getGlobalSettings()
        if (engineResponse.success && engineResponse.data) {
          setEngineSettings(engineResponse.data)
        }
      }
      catch (engineError) {
        console.log('전역 엔진 설정 로드 실패 (첫 실행일 수 있음):', engineError)
      }
    }
    catch (error) {
      console.error('설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    }
    finally {
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
    }
    finally {
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
    }
    finally {
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
    }
    finally {
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
    }
    finally {
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
          <TabPane tab="사이트 관리" key="sites">
            <SiteSettings />
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
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings

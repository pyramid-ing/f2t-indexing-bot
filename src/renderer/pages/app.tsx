import React, { useEffect, useState } from 'react'
import { Layout } from 'antd'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import Settings from './Settings'
import Blogger from './Blogger'
import Sidebar from '../components/Sidebar'
import { getAppStatus } from '../api'
import FirstRunSetup from '../components/FirstRunSetup'
import SiteManagement from '../components/SiteManagement'
import IndexingDashboard from '../components/IndexingDashboard'

const { Header, Content } = Layout

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background-color: #ffffff;
`

const StyledHeader = styled(Header)`
  padding: 0;
  background: #ffffff;
  border-bottom: 1px solid #ddd;
`

const StyledContent = styled(Content)`
  margin: 16px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`

interface AppStatus {
  initialized: boolean
  setupCompleted: boolean
  firstRun: boolean
  appVersion: string
  error?: string
}

const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    checkAppStatus()
  }, [])

  useEffect(() => {
    if (appStatus && appStatus.setupCompleted && location.pathname === '/') {
      navigate('/dashboard')
    }
  }, [appStatus, location, navigate])

  const checkAppStatus = async () => {
    try {
      const status = await getAppStatus()
      setAppStatus(status)
    } catch (error) {
      console.error('앱 상태 확인 실패:', error)

      // 네트워크 연결 오류인지 확인
      const isNetworkError =
        error?.code === 'ECONNREFUSED' ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('Network Error') ||
        error?.response?.status === undefined

      const errorMessage = isNetworkError
        ? '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
        : `상태 확인 실패: ${error?.message || '알 수 없는 오류'}`

      setAppStatus({
        initialized: false,
        setupCompleted: false,
        firstRun: true,
        appVersion: '1.0.0',
        error: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  // 초기 설정이 완료되지 않은 경우 FirstRunSetup 표시
  if (loading || !appStatus || !appStatus.setupCompleted) {
    return <FirstRunSetup onSetupComplete={checkAppStatus} />
  }

  return (
    <StyledLayout>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        selectedKey={location.pathname}
        onMenuClick={key => navigate(key)}
        appVersion={appStatus.appVersion}
      />

      <Layout>
        <StyledHeader>
          <div style={{ padding: '0 20px', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>F2T 인덱싱 봇</div>
        </StyledHeader>
        <StyledContent>
          <Routes>
            <Route path="/dashboard" element={<IndexingDashboard />} />
            <Route path="/sites" element={<SiteManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/blogger" element={<Blogger />} />
            <Route path="/" element={<IndexingDashboard />} />
          </Routes>
        </StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default App

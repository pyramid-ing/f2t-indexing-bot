import React, { useEffect, useState } from 'react'
import { Layout } from 'antd'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import Settings from './Settings'
import Sidebar from '../components/Sidebar'
import { getAppStatus } from '../api'
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
  const [appReady, setAppReady] = useState(false)
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    checkAppStatus()
  }, [])

  useEffect(() => {
    if (appReady && location.pathname === '/') {
      navigate('/dashboard')
    }
  }, [appReady, location, navigate])

  const checkAppStatus = async () => {
    try {
      const status = await getAppStatus()
      setAppVersion(status.appVersion || '1.0.0')
      setAppReady(true)
    } catch (error) {
      console.error('앱 상태 확인 실패:', error)
      // 에러가 있어도 앱을 시작하되, FirstRunSetup에서 처리
      setAppReady(false)
    }
  }

  return (
    <StyledLayout>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        selectedKey={location.pathname}
        onMenuClick={key => navigate(key)}
        appVersion={appVersion}
      />

      <Layout>
        <StyledHeader>
          <div style={{ padding: '0 20px', color: '#333', fontSize: '16px', fontWeight: 'bold' }}>F2T 인덱싱 봇</div>
        </StyledHeader>
        <StyledContent>
          <Routes>
            <Route path="/dashboard" element={<IndexingDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<IndexingDashboard />} />
          </Routes>
        </StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default App

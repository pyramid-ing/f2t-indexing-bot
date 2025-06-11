import React, { useEffect, useState } from 'react'
import { Layout } from 'antd'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { ipcRenderer } from 'electron'
import Settings from './Settings'
import Login from './Login'
import Sidebar from '../components/Sidebar'
import { checkLoginStatus } from '../utils/auth'

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

const App: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('')
  const [collapsed, setCollapsed] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [msg, setMsg] = useState('')

  const verifyAuth = async () => {
    const { isLoggedIn } = await checkLoginStatus()
    setIsLoggedIn(isLoggedIn)

    if (!isLoggedIn && location.pathname !== '/login') {
      navigate('/login')
    }
  }

  useEffect(() => {
    fetchVersion()
    verifyAuth()
  }, [])

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/add-keyword')
    }
  }, [location, navigate])

  const fetchVersion = async () => {
    const version = await ipcRenderer.invoke('get-app-version')
    setAppVersion(version)
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
        <StyledHeader />
        <StyledContent>
          <h1>자동 색인</h1>
          <Routes>
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default App

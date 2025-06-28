import { HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import React from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'
import IndexingDashboardPage from './IndexingDashboardPage'
import SettingsPage from './Settings'

const { Sider, Header, Content } = Layout

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`

const StyledHeader = styled(Header)`
  padding: 0 24px;
  background: #fff;
  font-size: 18px;
  font-weight: bold;
`

const StyledContent = styled(Content)`
  margin: 24px 16px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
`

const Logo = styled.div`
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  border-radius: 4px;
`

interface AppStatus {
  initialized: boolean
  setupCompleted: boolean
  firstRun: boolean
  appVersion: string
  error?: string
}

const App: React.FC = () => {
  return (
    <StyledLayout>
      <Sider width={200}>
        <Logo>F2T 인덱싱</Logo>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<HomeOutlined />}>
            <NavLink to="/">인덱싱 대시보드</NavLink>
          </Menu.Item>
          <Menu.Item key="2" icon={<SettingOutlined />}>
            <NavLink to="/settings">설정</NavLink>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <StyledHeader>F2T 인덱싱 봇</StyledHeader>
        <StyledContent>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<IndexingDashboardPage />} />
          </Routes>
        </StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default App

import React from 'react'
import { Layout, Menu } from 'antd'
import { SettingOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons'
import styled from 'styled-components'

const { Sider } = Layout

const Logo = styled.div`
  text-align: center;
  background-color: #ff4d4f;
  color: white;
  font-weight: bold;
  padding: 16px;
`

const StyledSider = styled(Sider)`
  background-color: #f5f5f5;
`

const StyledMenu = styled(Menu)`
  background-color: #f5f5f5;
  color: #000000;
`

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  selectedKey: string
  onMenuClick: (key: string) => void
  appVersion: string
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse, selectedKey, onMenuClick, appVersion }) => {
  const menuItems = [
    { key: '/add-keyword', icon: <MessageOutlined />, label: '자동 답변' },
    { key: '/settings', icon: <SettingOutlined />, label: '설정' },
    { key: '/login', icon: <UserOutlined />, label: '로그인' },
  ]

  return (
    <StyledSider collapsible collapsed={collapsed} onCollapse={onCollapse}>
      <Logo>N사 자동답변 v{appVersion}</Logo>
      <StyledMenu
        theme="light"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => onMenuClick(key)}
      />
    </StyledSider>
  )
}

export default Sidebar

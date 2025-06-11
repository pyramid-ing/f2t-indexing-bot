import React from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  GlobalOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

const { Sider } = Layout

const StyledSider = styled(Sider)`
  .ant-layout-sider-trigger {
    background: #001529;
  }
`

const Logo = styled.div`
  height: 64px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  text-align: center;
`

const VersionInfo = styled.div`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
  text-align: center;
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
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '대시보드',
    },
    {
      key: '/sites',
      icon: <GlobalOutlined />,
      label: '사이트 관리',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '설정',
    },
  ]

  return (
    <StyledSider trigger={null} collapsible collapsed={collapsed} onCollapse={onCollapse} theme="dark" width={200}>
      <Logo>{collapsed ? 'F2T' : 'F2T 인덱싱 봇'}</Logo>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => onMenuClick(key)}
      />

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
          cursor: 'pointer',
          fontSize: 16,
        }}
        onClick={() => onCollapse(!collapsed)}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>

      {!collapsed && <VersionInfo>v{appVersion}</VersionInfo>}
    </StyledSider>
  )
}

export default Sidebar

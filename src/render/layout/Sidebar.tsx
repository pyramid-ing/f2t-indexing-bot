import React, { useState } from 'react'
import { Layout, Menu } from 'antd'
import { HomeOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

const { Sider } = Layout

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '인덱싱 대시보드',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '설정',
    },
    {
      key: '/naver-accounts',
      icon: <UserOutlined />,
      label: '네이버 계정',
    },
  ]

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      theme="light"
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      <div className="h-16 flex items-center justify-center">
        <h1 className="text-lg font-bold">F2T 인덱싱</h1>
      </div>
      <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
    </Sider>
  )
}

export default Sidebar

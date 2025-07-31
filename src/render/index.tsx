import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as Router } from 'react-router-dom'
import App from './pages/app'
import './styles/global.css'

// dayjs 한국어 설정
dayjs.locale('ko')

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <StyleProvider hashPriority="high">
    <ConfigProvider locale={koKR}>
      <Router>
        <App />
      </Router>
    </ConfigProvider>
  </StyleProvider>,
)

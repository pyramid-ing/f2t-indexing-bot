import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter as Router } from 'react-router-dom'
import { StyleProvider } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import './styles/global.css'
import App from './pages/app'
import { RecoilRoot } from 'recoil'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <StyleProvider layer>
    <ConfigProvider>
      <RecoilRoot>
        <Router>
          <App />
        </Router>
      </RecoilRoot>
    </ConfigProvider>
  </StyleProvider>,
)

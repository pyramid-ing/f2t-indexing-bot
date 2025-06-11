import React, { useState, useEffect } from 'react'
import { Card, Typography, Spin } from 'antd'
import { DatabaseOutlined } from '@ant-design/icons'
import { getAppStatus } from '../api'

const { Title, Paragraph } = Typography

interface AppStatus {
  initialized: boolean
  setupCompleted: boolean
  firstRun: boolean
  appVersion: string
  error?: string
}

interface FirstRunSetupProps {
  onSetupComplete: () => void
}

const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onSetupComplete }) => {
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    checkAppStatus()
  }, [])

  const checkAppStatus = async () => {
    try {
      const status = await getAppStatus()
      setAppStatus(status)

      if (status.setupCompleted || status.initialized) {
        // 약간의 지연 후 메인 앱으로 진입
        setTimeout(() => {
          onSetupComplete()
        }, 1000)
      }
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

      // 5초 후 재시도 (최대 3번)
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(retryCount + 1)
          checkAppStatus()
        }, 5000)
      }
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card style={{ width: 400, textAlign: 'center' }}>
        <div style={{ padding: '40px 0' }}>
          <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3}>F2T 인덱싱 봇</Title>

          {appStatus?.error ? (
            <>
              <Paragraph type="danger" style={{ marginBottom: 16 }}>
                {appStatus.error}
              </Paragraph>
              {retryCount < 3 && (
                <Paragraph type="secondary">
                  {5 - retryCount * 5}초 후 재시도... ({retryCount + 1}/3)
                </Paragraph>
              )}
              {retryCount >= 3 && (
                <Paragraph type="secondary">
                  백엔드 서버를 수동으로 시작해주세요: <br />
                  <code>cd backend && npm run dev</code>
                </Paragraph>
              )}
            </>
          ) : (
            <>
              <Spin size="large" style={{ marginBottom: 16 }} />
              <Paragraph type="secondary">데이터베이스 초기화 중...</Paragraph>
            </>
          )}

          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 20 }}>
            버전 {appStatus?.appVersion || '1.0.0'}
          </Paragraph>
        </div>
      </Card>
    </div>
  )
}

export default FirstRunSetup

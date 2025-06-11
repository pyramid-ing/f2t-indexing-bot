import React, { useState, useEffect } from 'react'
import { Button, Card, Steps, Typography, Space, Alert } from 'antd'
import { CheckCircleOutlined, SettingOutlined, DatabaseOutlined } from '@ant-design/icons'
import { getAppStatus, markSetupCompleted, reinitializeDatabase } from '../api'

const { Title, Paragraph } = Typography
const { Step } = Steps

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
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(0)
  const [reinitializing, setReinitializing] = useState(false)

  useEffect(() => {
    checkAppStatus()
  }, [])

  const checkAppStatus = async () => {
    try {
      const status = await getAppStatus()
      setAppStatus(status)

      if (status.setupCompleted) {
        onSetupComplete()
        return
      }

      if (status.initialized) {
        setSetupStep(1)
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
    } finally {
      setLoading(false)
    }
  }

  const completeSetup = async () => {
    try {
      setLoading(true)
      await markSetupCompleted()
      onSetupComplete()
    } catch (error) {
      console.error('설정 완료 처리 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReinitializeDatabase = async () => {
    try {
      setReinitializing(true)
      await reinitializeDatabase()
      await checkAppStatus()
    } catch (error) {
      console.error('데이터베이스 재초기화 실패:', error)
    } finally {
      setReinitializing(false)
    }
  }

  if (loading && !appStatus) {
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
            <Title level={4}>앱 초기화 중...</Title>
            <Paragraph type="secondary">잠시만 기다려주세요.</Paragraph>
          </div>
        </Card>
      </div>
    )
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
      <Card style={{ width: 600, padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SettingOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
          <Title level={2}>F2T 인덱싱 봇에 오신 것을 환영합니다!</Title>
          <Paragraph type="secondary">
            블로그 포스트를 Google, Bing, Naver, Daum에 자동으로 색인 요청하는 도구입니다.
          </Paragraph>
        </div>

        <Steps current={setupStep} style={{ marginBottom: 32 }}>
          <Step
            title="데이터베이스 초기화"
            description="SQLite 데이터베이스 생성"
            icon={setupStep > 0 ? <CheckCircleOutlined /> : undefined}
          />
          <Step
            title="초기 설정"
            description="기본 설정 완료"
            icon={setupStep > 1 ? <CheckCircleOutlined /> : undefined}
          />
        </Steps>

        {appStatus?.error && (
          <Alert message="오류 발생" description={appStatus.error} type="error" style={{ marginBottom: 16 }} />
        )}

        {setupStep === 0 && (
          <div style={{ textAlign: 'center' }}>
            <Title level={4}>데이터베이스 초기화</Title>
            <Paragraph>앱을 사용하기 위해 데이터베이스를 초기화합니다.</Paragraph>
            <Space>
              <Button type="primary" size="large" onClick={() => setSetupStep(1)} disabled={!appStatus?.initialized}>
                계속하기
              </Button>
            </Space>
          </div>
        )}

        {setupStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <Title level={4}>설정 완료</Title>
            <Paragraph>
              데이터베이스가 성공적으로 초기화되었습니다.
              <br />
              이제 사이트를 추가하고 인덱싱을 시작할 수 있습니다.
            </Paragraph>

            <Alert
              message="다음 단계"
              description={
                <ul style={{ textAlign: 'left', paddingLeft: 20 }}>
                  <li>사이트 추가 및 설정</li>
                  <li>검색엔진별 API 키 등록</li>
                  <li>인덱싱할 URL 관리</li>
                </ul>
              }
              type="info"
              style={{ marginBottom: 24, textAlign: 'left' }}
            />

            <Space>
              <Button onClick={handleReinitializeDatabase} loading={reinitializing}>
                DB 재초기화
              </Button>
              <Button type="primary" size="large" onClick={completeSetup} loading={loading}>
                설정 완료
              </Button>
            </Space>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            버전 {appStatus?.appVersion || '1.0.0'}
          </Paragraph>
        </div>
      </Card>
    </div>
  )
}

export default FirstRunSetup

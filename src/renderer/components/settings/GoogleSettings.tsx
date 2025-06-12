import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Row, Col, Divider, Avatar } from 'antd'
import { GoogleOutlined, SaveOutlined } from '@ant-design/icons'
import { startGoogleLogin, getGoogleAuthStatus, logoutGoogle } from '../../utils/googleAuth'
import { getErrorMessage, getErrorDetails } from '../../api'

const { Title, Text } = Typography
const { TextArea } = Input

interface GoogleEngineSettings {
  use: boolean
  serviceAccountEmail: string
  privateKey: string
  oauth2ClientId: string
  oauth2ClientSecret: string
  oauth2AccessToken: string
  oauth2RefreshToken: string
  oauth2TokenExpiry: string
}

interface GoogleSettingsProps {
  settings: GoogleEngineSettings
  onSave: (values: Partial<GoogleEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false)
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(null)

  useEffect(() => {
    checkGoogleAuthStatus()
  }, [settings.oauth2ClientId, settings.oauth2ClientSecret])

  const checkGoogleAuthStatus = async () => {
    if (!settings.oauth2ClientId || !settings.oauth2ClientSecret) {
      setIsGoogleLoggedIn(false)
      setGoogleUserInfo(null)
      return
    }

    try {
      const status = await getGoogleAuthStatus()
      setIsGoogleLoggedIn(status.isLoggedIn)
      setGoogleUserInfo(status.userInfo)
    } catch (error) {
      console.error('Google 인증 상태 확인 실패:', error)
      const errorMessage = getErrorMessage(error)
      console.log('인증 상태 확인 실패:', errorMessage)
      setIsGoogleLoggedIn(false)
      setGoogleUserInfo(null)
    }
  }

  const handleSubmit = async (values: Partial<GoogleEngineSettings>) => {
    try {
      await onSave(values)
      message.success('Google 설정이 저장되었습니다.')

      // OAuth 설정이 변경되었으면 인증 상태 재확인
      if (values.oauth2ClientId || values.oauth2ClientSecret) {
        setTimeout(checkGoogleAuthStatus, 1000)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    }
  }

  const handleGoogleLogin = async () => {
    if (!settings.oauth2ClientId?.trim() || !settings.oauth2ClientSecret?.trim()) {
      message.error('먼저 OAuth2 Client ID와 Client Secret을 설정하고 저장해주세요.')
      return
    }

    try {
      const result = startGoogleLogin(settings.oauth2ClientId)
      if (result.success) {
        message.info(result.message)

        // 주기적으로 로그인 상태 확인 (5초마다, 최대 2분)
        let attempts = 0
        const maxAttempts = 24 // 2분 (5초 * 24)

        const checkInterval = setInterval(async () => {
          attempts++
          try {
            const status = await getGoogleAuthStatus()
            if (status.isLoggedIn && status.userInfo) {
              clearInterval(checkInterval)
              setIsGoogleLoggedIn(true)
              setGoogleUserInfo(status.userInfo)
              message.success(`Google 계정 연동이 완료되었습니다. (${status.userInfo.email})`)
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              message.warning('로그인 확인 시간이 초과되었습니다. 페이지를 새로고침해서 상태를 확인해주세요.')
            }
          } catch (error) {
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              message.error('로그인 상태 확인 중 오류가 발생했습니다.')
            }
          }
        }, 5000)
      }
    } catch (error: any) {
      console.error('Google 로그인 실패:', error)
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    }
  }

  const handleGoogleLogout = async () => {
    try {
      const result = await logoutGoogle()
      setIsGoogleLoggedIn(false)
      setGoogleUserInfo(null)
      message.success(result.message || 'Google 계정 연동이 해제되었습니다.')
    } catch (error: any) {
      console.error('Google 로그아웃 실패:', error)
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    }
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <GoogleOutlined style={{ color: '#4285f4', marginRight: 8 }} />
            Google 설정
          </span>
          <Switch
            checked={settings.use}
            onChange={onToggleUse}
            checkedChildren="사용"
            unCheckedChildren="미사용"
            loading={loading}
          />
        </div>
      }
    >
      {settings.use && (
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
          {/* Service Account 섹션 */}
          <div style={{ marginBottom: 24 }}>
            <Divider orientation="left">
              <Text strong style={{ color: '#1890ff' }}>
                🔧 Service Account 설정
              </Text>
            </Divider>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Google Indexing API를 위한 Service Account 인증 정보
            </Text>

            <Form.Item
              name="serviceAccountEmail"
              label="Service Account Email"
              help="Google Cloud Console > IAM > Service Accounts에서 생성한 Service Account 이메일"
              rules={[{ type: 'email', message: '올바른 이메일 주소를 입력해주세요' }]}
            >
              <Input placeholder="service-account@project-id.iam.gserviceaccount.com" size="large" />
            </Form.Item>

            <Form.Item
              name="privateKey"
              label="Private Key"
              help="Service Account의 Private Key (JSON 키 파일 전체 내용 또는 private_key 값만)"
            >
              <TextArea
                rows={6}
                placeholder='전체 JSON: {"type": "service_account", "project_id": "your-project", "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", ...}
또는 키만: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----'
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
            </Form.Item>
          </div>

          {/* OAuth2 섹션 */}
          <div style={{ marginBottom: 24 }}>
            <Divider orientation="left">
              <Text strong style={{ color: '#52c41a' }}>
                🔐 OAuth2 설정
              </Text>
            </Divider>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Google Blogger API 및 사용자 인증을 위한 OAuth2 클라이언트 정보
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="oauth2ClientId"
                  label="OAuth2 Client ID"
                  help="Google Cloud Console > APIs & Services > Credentials에서 생성한 OAuth 2.0 클라이언트 ID"
                >
                  <Input placeholder="123456789-abcdefghijklmnop.apps.googleusercontent.com" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="oauth2ClientSecret"
                  label="OAuth2 Client Secret"
                  help="OAuth 2.0 클라이언트의 비밀번호"
                >
                  <Input.Password placeholder="GOCSPX-********************************" size="large" />
                </Form.Item>
              </Col>
            </Row>

            {/* OAuth 로그인 상태 */}
            <div
              style={{
                backgroundColor: isGoogleLoggedIn ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${isGoogleLoggedIn ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
              }}
            >
              <Text strong style={{ color: isGoogleLoggedIn ? '#389e0d' : '#cf1322' }}>
                {isGoogleLoggedIn ? '✅ Google 계정 연동됨' : '❌ Google 계정 연동 필요'}
              </Text>
              {isGoogleLoggedIn && googleUserInfo ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar src={googleUserInfo.picture} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{googleUserInfo.name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {googleUserInfo.email}
                      </Text>
                    </div>
                    <Button type="link" danger onClick={handleGoogleLogout}>
                      연동 해제
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Google Blogger API 사용을 위해 계정 연동이 필요합니다.</Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<GoogleOutlined />}
                    onClick={handleGoogleLogin}
                    disabled={!settings.oauth2ClientId?.trim() || !settings.oauth2ClientSecret?.trim()}
                  >
                    Google 계정 연동
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Google 설정 저장
            </Button>
          </Form.Item>
        </Form>
      )}

      {!settings.use && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#8c8c8c',
          }}
        >
          <GoogleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>
            <Text type="secondary">Google 서비스가 비활성화되어 있습니다.</Text>
            <br />
            <Text type="secondary">위의 스위치를 켜서 Google 설정을 활성화하세요.</Text>
          </div>
        </div>
      )}
    </Card>
  )
}

export default GoogleSettings

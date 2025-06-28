import type { GoogleConfig } from '../../api'
import { GoogleOutlined, SaveOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Divider, Form, Input, message, Switch, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { getErrorDetails, getErrorMessage } from '../../api'
import { getGoogleAuthStatus, logoutGoogle, startGoogleLogin } from '../../utils/googleAuth'

const { Title, Text } = Typography
const { TextArea } = Input

interface GoogleSettingsProps {
  settings: GoogleConfig
  onSave: (values: Partial<GoogleConfig>) => Promise<void>
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
    }
    catch (error) {
      console.error('Google 인증 상태 확인 실패:', error)
      const errorMessage = getErrorMessage(error)
      console.log('인증 상태 확인 실패:', errorMessage)
      setIsGoogleLoggedIn(false)
      setGoogleUserInfo(null)
    }
  }

  const handleSubmit = async (values: Partial<GoogleConfig>) => {
    try {
      await onSave(values)
      message.success('Google 설정이 저장되었습니다.')

      // OAuth 설정이 변경되었으면 인증 상태 재확인
      if (values.oauth2ClientId || values.oauth2ClientSecret) {
        setTimeout(checkGoogleAuthStatus, 1000)
      }
    }
    catch (error) {
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
            }
            else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              message.warning('로그인 확인 시간이 초과되었습니다. 페이지를 새로고침해서 상태를 확인해주세요.')
            }
          }
          catch (error) {
            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              message.error('로그인 상태 확인 중 오류가 발생했습니다.')
            }
          }
        }, 5000)
      }
    }
    catch (error: any) {
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
    }
    catch (error) {
      const errorMessage = getErrorMessage(error)
      message.error(errorMessage)
    }
  }

  return (
    <div>
      <Title level={3}>
        <GoogleOutlined className="mr-2" />
        Google 색인 설정
      </Title>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text strong className="text-lg">Google 색인 서비스</Text>
            <br />
            <Text type="secondary">Google Search Console API를 통한 URL 색인 요청</Text>
          </div>
          <Switch
            checked={settings.use}
            onChange={onToggleUse}
            loading={loading}
            checkedChildren="사용"
            unCheckedChildren="미사용"
          />
        </div>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={settings}
      >
        {/* Service Account 설정 */}
        <Card title="Service Account 설정" className="mb-4">
          <Form.Item
            name="serviceAccountEmail"
            label="Service Account Email"
            rules={[
              { required: settings.use, message: 'Service Account Email을 입력해주세요!' },
              { type: 'email', message: '올바른 이메일 형식을 입력해주세요!' },
            ]}
          >
            <Input
              placeholder="your-service-account@project-id.iam.gserviceaccount.com"
              disabled={!settings.use}
            />
          </Form.Item>

          <Form.Item
            name="privateKey"
            label="Private Key"
            rules={[
              { required: settings.use, message: 'Private Key를 입력해주세요!' },
            ]}
          >
            <TextArea
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              rows={6}
              disabled={!settings.use}
            />
          </Form.Item>

          <Alert
            message="Service Account 설정 방법"
            description={(
              <div>
                <p>1. Google Cloud Console에서 프로젝트 생성</p>
                <p>2. Google Search Console API 활성화</p>
                <p>3. Service Account 생성 및 키 다운로드</p>
                <p>4. Service Account를 Search Console 속성에 추가</p>
              </div>
            )}
            type="info"
            showIcon
            className="mb-4"
          />
        </Card>

        {/* OAuth2 설정 */}
        <Card title="OAuth2 설정 (선택사항)" className="mb-4">
          <Form.Item
            name="oauth2ClientId"
            label="OAuth2 Client ID"
          >
            <Input
              placeholder="xxx.apps.googleusercontent.com"
              disabled={!settings.use}
            />
          </Form.Item>

          <Form.Item
            name="oauth2ClientSecret"
            label="OAuth2 Client Secret"
          >
            <Input.Password
              placeholder="GOCSPX-xxx"
              disabled={!settings.use}
            />
          </Form.Item>

          {/* Google 계정 연동 상태 */}
          {settings.oauth2ClientId && settings.oauth2ClientSecret && (
            <div className="mb-4">
              <Divider />
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>Google 계정 연동</Text>
                  <br />
                  {isGoogleLoggedIn
                    ? (
                        <Text type="success">
                          연동됨:
                          {' '}
                          {googleUserInfo?.email}
                        </Text>
                      )
                    : (
                        <Text type="secondary">연동되지 않음</Text>
                      )}
                </div>
                <div>
                  {isGoogleLoggedIn
                    ? (
                        <Button
                          onClick={handleGoogleLogout}
                          danger
                        >
                          연동 해제
                        </Button>
                      )
                    : (
                        <Button
                          type="primary"
                          onClick={handleGoogleLogin}
                        >
                          Google 계정 연동
                        </Button>
                      )}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading}
            disabled={!settings.use}
          >
            설정 저장
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default GoogleSettings

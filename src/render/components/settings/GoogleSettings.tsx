import { GoogleOutlined, SaveOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Divider, Form, Input, message, Switch, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { getErrorDetails, getErrorMessage } from '../../api'
import { getGoogleAuthStatus, logoutGoogle, startGoogleLogin } from '../../utils/googleAuth'

const { Title, Text } = Typography
const { TextArea } = Input

interface GoogleEngineSettings {
  use: boolean
  serviceAccountJson: string
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
  const [jsonError, setJsonError] = useState<string>('')
  const [jsonPreview, setJsonPreview] = useState<{ email: string, projectId: string } | null>(null)

  useEffect(() => {
    checkGoogleAuthStatus()
  }, [settings.oauth2ClientId, settings.oauth2ClientSecret])

  useEffect(() => {
    // 초기 JSON 미리보기 설정
    if (settings.serviceAccountJson) {
      validateAndPreviewJson(settings.serviceAccountJson)
    }
  }, [settings.serviceAccountJson])

  const validateAndPreviewJson = (jsonStr: string) => {
    if (!jsonStr.trim()) {
      setJsonError('')
      setJsonPreview(null)
      return true
    }

    try {
      const parsed = JSON.parse(jsonStr)

      // Service Account JSON 구조 검증
      if (parsed.type !== 'service_account') {
        setJsonError('Service Account JSON이 아닙니다. type이 "service_account"인지 확인해주세요.')
        setJsonPreview(null)
        return false
      }

      const requiredFields = ['project_id', 'private_key', 'client_email', 'client_id', 'auth_uri', 'token_uri']
      const missingFields = requiredFields.filter(field => !parsed[field])

      if (missingFields.length > 0) {
        setJsonError(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`)
        setJsonPreview(null)
        return false
      }

      // JSON이 유효하면 미리보기 정보 설정
      setJsonPreview({
        email: parsed.client_email,
        projectId: parsed.project_id,
      })
      setJsonError('')
      return true
    }
    catch (error) {
      setJsonError('유효하지 않은 JSON 형식입니다.')
      setJsonPreview(null)
      return false
    }
  }

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

  const handleSubmit = async (values: Partial<GoogleEngineSettings>) => {
    // JSON 유효성 재검사
    if (values.serviceAccountJson && !validateAndPreviewJson(values.serviceAccountJson)) {
      message.error('Service Account JSON을 확인해주세요.')
      return
    }

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

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    validateAndPreviewJson(value)
    form.setFieldsValue({ serviceAccountJson: value })
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
    catch (error: any) {
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
      title={(
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
      )}
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
              Google Indexing API를 위한 Service Account JSON 키 파일을 붙여넣으세요
            </Text>

            <Form.Item
              name="serviceAccountJson"
              label="Service Account JSON"
              help="Google Cloud Console > IAM > Service Accounts에서 다운로드한 JSON 키 파일의 전체 내용을 붙여넣으세요"
              rules={[
                { required: true, message: 'Service Account JSON을 입력해주세요' },
                {
                  validator: (_, value) => {
                    if (!value)
                      return Promise.resolve()
                    if (validateAndPreviewJson(value)) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error(jsonError || '유효하지 않은 JSON입니다'))
                  },
                },
              ]}
            >
              <TextArea
                rows={8}
                placeholder={`{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}`}
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
                onChange={handleJsonChange}
              />
            </Form.Item>

            {/* JSON 유효성 검사 결과 표시 */}
            {jsonError && (
              <Alert
                message="JSON 오류"
                description={jsonError}
                type="error"
                style={{ marginBottom: 16 }}
              />
            )}

            {/* JSON 미리보기 */}
            {jsonPreview && (
              <Alert
                message="Service Account 정보 확인됨"
                description={(
                  <div>
                    <div>
                      <strong>이메일:</strong>
                      {' '}
                      {jsonPreview.email}
                    </div>
                    <div>
                      <strong>프로젝트 ID:</strong>
                      {' '}
                      {jsonPreview.projectId}
                    </div>
                  </div>
                )}
                type="success"
                style={{ marginBottom: 16 }}
              />
            )}
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

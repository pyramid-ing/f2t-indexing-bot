import type { GoogleConfig } from '../../api'
import { GoogleOutlined, SaveOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, message, Switch, Typography } from 'antd'
import React from 'react'
import { getErrorDetails, getErrorMessage } from '../../api'

const { Title, Text } = Typography
const { TextArea } = Input

interface GoogleSettingsProps {
  settings: GoogleConfig
  onSave: (values: Partial<GoogleConfig>) => Promise<void>
  loading: boolean
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ settings, onSave, loading }) => {
  const [form] = Form.useForm()
  const [localUse, setLocalUse] = React.useState(settings.use)
  const [jsonValue, setJsonValue] = React.useState(settings.serviceAccountJson || '')

  // 설정이 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setLocalUse(settings.use)
    setJsonValue(settings.serviceAccountJson || '')
    form.setFieldsValue({
      serviceAccountJson: settings.serviceAccountJson || '',
    })
  }, [settings, form])

  const handleSubmit = async (values: Partial<GoogleConfig>) => {
    try {
      // use가 true인데 필수 필드가 비어있으면 저장 불가
      if (localUse) {
        if (!values.serviceAccountJson) {
          message.error('Service Account JSON을 입력해주세요.')
          return
        }
        try {
          JSON.parse(values.serviceAccountJson)
        } catch {
          message.error('유효한 JSON 형식이 아닙니다.')
          return
        }
      }

      const finalValues = { ...values, use: localUse }
      await onSave(finalValues)
      message.success('Google 설정이 저장되었습니다.')
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

  const handleUseToggle = (checked: boolean) => {
    setLocalUse(checked)
    // 바로 저장하지 않고 로컬 상태만 변경
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
            <Text strong className="text-lg">
              Google 색인 서비스
            </Text>
            <br />
            <Text type="secondary">Google Search Console API를 통한 URL 색인 요청</Text>
          </div>
          <Switch
            checked={localUse}
            onChange={handleUseToggle}
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
        preserve={false}
        key={JSON.stringify(settings)}
      >
        {/* Service Account 설정 */}
        <Card title="Service Account 설정" className="mb-4">
          {/* 현재 설정 값 표시 */}
          {settings.serviceAccountJson && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: '#f6f8fa',
                borderRadius: 6,
                border: '1px solid #d1d9e0',
              }}
            >
              <Text strong style={{ color: '#0969da' }}>
                현재 저장된 Service Account JSON:
              </Text>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#656d76',
                  maxHeight: 100,
                  overflow: 'auto',
                }}
              >
                {settings.serviceAccountJson.substring(0, 200)}
                {settings.serviceAccountJson.length > 200 && '...'}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                (처음 200자만 표시됩니다)
              </Text>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Service Account JSON</label>
            <TextArea
              placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
              rows={8}
              disabled={!localUse}
              className="font-mono text-xs"
              value={jsonValue}
              onChange={e => {
                const newValue = e.target.value
                setJsonValue(newValue)
                form.setFieldsValue({ serviceAccountJson: newValue })
              }}
            />
          </div>

          <Form.Item
            name="serviceAccountJson"
            hidden
            rules={[
              { required: localUse, message: 'Service Account JSON을 업로드해주세요!' },
              {
                validator: (_, value) => {
                  if (!localUse || !value) return Promise.resolve()
                  try {
                    JSON.parse(value)
                    return Promise.resolve()
                  } catch {
                    return Promise.reject(new Error('유효한 JSON 형식이 아닙니다.'))
                  }
                },
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Alert
            message="Service Account 설정 방법"
            description={
              <div>
                <p>1. Google Cloud Console에서 프로젝트 생성</p>
                <p>2. Google Search Console API 활성화</p>
                <p>3. Service Account 생성 및 JSON 키 다운로드</p>
                <p>4. Service Account를 Search Console 속성에 추가</p>
                <p>5. 다운로드한 JSON 파일을 위에 업로드</p>
              </div>
            }
            type="info"
            showIcon
            className="mb-4"
          />
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            설정 저장
          </Button>
          {!localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#faad14' }}>
                위의 스위치를 켜고 설정을 완료한 후 저장해주세요.
              </Text>
            </div>
          )}
          {localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#1890ff' }}>
                Service Account JSON을 입력하고 저장 버튼을 눌러주세요.
              </Text>
            </div>
          )}
        </Form.Item>
      </Form>
    </div>
  )
}

export default GoogleSettings

import type { UploadFile } from 'antd/es/upload/interface'
import type { GoogleConfig } from '../../api'
import { GoogleOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, message, Switch, Typography, Upload } from 'antd'
import React, { useState } from 'react'
import { getErrorDetails, getErrorMessage } from '../../api'

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
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleSubmit = async (values: Partial<GoogleConfig>) => {
    try {
      await onSave(values)
      message.success('Google 설정이 저장되었습니다.')
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

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text()
      // JSON 유효성 검사
      JSON.parse(text)

      // Form 필드 업데이트
      form.setFieldsValue({
        serviceAccountJson: text,
      })

      message.success('Service Account JSON 파일이 업로드되었습니다.')
      return false // 자동 업로드 방지
    }
    catch (error) {
      message.error('유효하지 않은 JSON 파일입니다.')
      return false
    }
  }

  const beforeUpload = (file: File) => {
    const isJson = file.type === 'application/json' || file.name.endsWith('.json')
    if (!isJson) {
      message.error('JSON 파일만 업로드할 수 있습니다.')
      return false
    }
    return handleFileUpload(file)
  }

  const uploadProps = {
    beforeUpload,
    fileList,
    onChange: ({ fileList }: { fileList: UploadFile[] }) => {
      setFileList(fileList)
    },
    onRemove: () => {
      form.setFieldsValue({
        serviceAccountJson: '',
      })
      setFileList([])
    },
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
          <div className="mb-4">
            <Text strong>Service Account JSON 파일 업로드</Text>
            <br />
            <Text type="secondary">
              Google Cloud Console에서 다운로드한 Service Account 키 파일(JSON)을 업로드하세요.
            </Text>
          </div>

          <Form.Item
            name="serviceAccountJson"
            label="Service Account JSON"
            rules={[
              { required: settings.use, message: 'Service Account JSON을 업로드해주세요!' },
              {
                validator: (_, value) => {
                  if (!settings.use || !value)
                    return Promise.resolve()
                  try {
                    JSON.parse(value)
                    return Promise.resolve()
                  }
                  catch {
                    return Promise.reject(new Error('유효한 JSON 형식이 아닙니다.'))
                  }
                },
              },
            ]}
          >
            <div>
              <Upload {...uploadProps}>
                <Button
                  icon={<UploadOutlined />}
                  disabled={!settings.use}
                  className="mb-2"
                >
                  JSON 파일 선택
                </Button>
              </Upload>
              <TextArea
                placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                rows={8}
                disabled={!settings.use}
                className="font-mono text-xs"
              />
            </div>
          </Form.Item>

          <Alert
            message="Service Account 설정 방법"
            description={(
              <div>
                <p>1. Google Cloud Console에서 프로젝트 생성</p>
                <p>2. Google Search Console API 활성화</p>
                <p>3. Service Account 생성 및 JSON 키 다운로드</p>
                <p>4. Service Account를 Search Console 속성에 추가</p>
                <p>5. 다운로드한 JSON 파일을 위에 업로드</p>
              </div>
            )}
            type="info"
            showIcon
            className="mb-4"
          />
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

import type { BingConfig } from '../../api'
import { SaveOutlined, YahooOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message, Switch, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

interface BingSettingsProps {
  settings: BingConfig
  onSave: (values: Partial<BingConfig>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const BingSettings: React.FC<BingSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: Partial<BingConfig>) => {
    try {
      await onSave(values)
      message.success('Bing 설정이 저장되었습니다.')
    }
    catch (error) {
      message.error('Bing 설정 저장에 실패했습니다.')
    }
  }

  return (
    <div>
      <Title level={3}>
        <YahooOutlined className="mr-2" />
        Bing 색인 설정
      </Title>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text strong className="text-lg">Bing 색인 서비스</Text>
            <br />
            <Text type="secondary">Bing URL Submission API를 통한 URL 제출</Text>
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

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
        <Card title="API 설정" className="mb-4">
          <Form.Item
            name="apiKey"
            label="Bing API Key"
            help="Bing Webmaster Tools > API Access에서 생성한 API 키"
            rules={[
              { required: settings.use, message: 'Bing API Key를 입력해주세요!' },
              { min: 32, message: 'API Key는 최소 32자 이상이어야 합니다.' },
            ]}
          >
            <Input.Password
              placeholder="********************************"
              disabled={!settings.use}
            />
          </Form.Item>
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

export default BingSettings

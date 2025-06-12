import React from 'react'
import { Card, Form, Input, Button, Switch, message, Typography } from 'antd'
import { YahooOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface BingEngineSettings {
  use: boolean
  apiKey: string
}

interface BingSettingsProps {
  settings: BingEngineSettings
  onSave: (values: Partial<BingEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const BingSettings: React.FC<BingSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: Partial<BingEngineSettings>) => {
    try {
      await onSave(values)
      message.success('Bing 설정이 저장되었습니다.')
    } catch (error) {
      message.error('Bing 설정 저장에 실패했습니다.')
    }
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <YahooOutlined style={{ color: '#00809d', marginRight: 8 }} />
            Bing 설정
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
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Bing URL Submission API를 사용하여 URL을 Bing 검색엔진에 제출합니다.
            </Text>

            <Form.Item
              name="apiKey"
              label="Bing API Key"
              help="Bing Webmaster Tools > API Access에서 생성한 API 키"
              rules={[
                { required: true, message: 'Bing API Key를 입력해주세요' },
                { min: 32, message: 'API Key는 최소 32자 이상이어야 합니다' },
              ]}
            >
              <Input.Password placeholder="********************************" size="large" />
            </Form.Item>

            <div
              style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text strong style={{ color: '#0050b3' }}>
                📋 Bing API Key 획득 방법
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  1.{' '}
                  <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
                    Bing Webmaster Tools
                  </a>
                  에 로그인
                  <br />
                  2. 사이트 추가 및 소유권 확인
                  <br />
                  3. Settings {'>'} API Access에서 API Key 생성
                  <br />
                  4. 생성된 API Key를 위 필드에 입력
                </Text>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd666',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text strong style={{ color: '#d48806' }}>
                ⚠️ 주의사항
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • API 요청 제한: 일일 10,000회
                  <br />
                  • URL 제출 후 즉시 색인되지 않을 수 있습니다
                  <br />• API Key는 안전한 곳에 보관하세요
                </Text>
              </div>
            </div>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              Bing 설정 저장
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
          <YahooOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>
            <Text type="secondary">Bing 서비스가 비활성화되어 있습니다.</Text>
            <br />
            <Text type="secondary">위의 스위치를 켜서 Bing 설정을 활성화하세요.</Text>
          </div>
        </div>
      )}
    </Card>
  )
}

export default BingSettings

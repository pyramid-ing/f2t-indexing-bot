import type { BingConfig } from '../../api'
import { SaveOutlined, YahooOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message, Switch, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

interface BingSettingsProps {
  settings: BingConfig
  onSave: (values: Partial<BingConfig>) => Promise<void>
  loading: boolean
}

const BingSettings: React.FC<BingSettingsProps> = ({ settings, onSave, loading }) => {
  const [form] = Form.useForm()
  const [localUse, setLocalUse] = React.useState(settings.use)

  // 설정이 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setLocalUse(settings.use)
  }, [settings.use])

  const handleSubmit = async (values: Partial<BingConfig>) => {
    try {
      // use가 true인데 필수 필드가 비어있으면 저장 불가
      if (localUse) {
        if (!values.apiKey) {
          message.error('Bing API Key를 입력해주세요.')
          return
        }
        if (values.apiKey.length < 32) {
          message.error('API Key는 최소 32자 이상이어야 합니다.')
          return
        }
      }

      const finalValues = { ...values, use: localUse }
      await onSave(finalValues)
      message.success('Bing 설정이 저장되었습니다.')
    } catch (error) {
      message.error('Bing 설정 저장에 실패했습니다.')
    }
  }

  const handleUseToggle = (checked: boolean) => {
    setLocalUse(checked)
    // 바로 저장하지 않고 로컬 상태만 변경
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
            <Text strong className="text-lg">
              Bing 색인 서비스
            </Text>
            <br />
            <Text type="secondary">Bing URL Submission API를 통한 URL 제출</Text>
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

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
        <Card title="API 설정" className="mb-4">
          <Form.Item
            name="apiKey"
            label="Bing API Key"
            help="Bing Webmaster Tools > API Access에서 생성한 API 키"
            rules={[
              { required: localUse, message: 'Bing API Key를 입력해주세요!' },
              { min: 32, message: 'API Key는 최소 32자 이상이어야 합니다.' },
            ]}
          >
            <Input.Password placeholder="********************************" disabled={!localUse} />
          </Form.Item>
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            설정 저장
          </Button>
          {!localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#faad14' }}>
                위의 스위치를 켜고 API Key를 입력한 후 저장해주세요.
              </Text>
            </div>
          )}
          {localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#1890ff' }}>
                API Key를 입력하고 저장 버튼을 눌러주세요.
              </Text>
            </div>
          )}
        </Form.Item>
      </Form>
    </div>
  )
}

export default BingSettings

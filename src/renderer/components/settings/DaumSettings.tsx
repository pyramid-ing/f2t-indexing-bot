import React from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Row, Col } from 'antd'
import { GlobalOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface DaumEngineSettings {
  use: boolean
  siteUrl: string
  password: string
  headless: boolean
}

interface DaumSettingsProps {
  settings: DaumEngineSettings
  onSave: (values: Partial<DaumEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    try {
      const settingsToSave = {
        ...values,
        headless: !values.showBrowser,
      }
      delete settingsToSave.showBrowser

      await onSave(settingsToSave)
      message.success('다음 설정이 저장되었습니다.')
    } catch (error) {
      message.error('다음 설정 저장에 실패했습니다.')
    }
  }

  const initialValues = {
    ...settings,
    showBrowser: !settings.headless,
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <GlobalOutlined style={{ color: '#0066cc', marginRight: 8 }} />
            다음 설정
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
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={initialValues}>
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              다음 검색등록에 URL을 제출합니다.
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="siteUrl"
                  label="사이트 URL"
                  help="다음에 등록할 웹사이트 주소"
                  rules={[
                    { required: true, message: '사이트 URL을 입력해주세요' },
                    { type: 'url', message: '올바른 URL 형식이 아닙니다' },
                  ]}
                >
                  <Input placeholder="https://example.com" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="PIN코드"
                  help="다음 검색등록 시 설정한 PIN코드"
                  rules={[{ required: true, message: 'PIN코드를 입력해주세요' }]}
                >
                  <Input.Password placeholder="abc12345" size="large" maxLength={12} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="showBrowser"
                  label="브라우저 창 모드"
                  help="스위치를 켜면 인덱싱 과정이 보이는 브라우저 창이 나타납니다 (디버깅용)."
                  valuePropName="checked"
                >
                  <Switch checkedChildren="창 보임" unCheckedChildren="창 숨김" />
                </Form.Item>
              </Col>
            </Row>

            <div
              style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd666',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text strong style={{ color: '#d48806' }}>
                📊 다음 등록 제한사항
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • 공식적인 개수 제한은 없으나 10개 이상부터 먹통되는 경우도 존재합니다
                  <br />• 크롤링 방식으로 실패하는 경우가 종종 있습니다. 이 경우 확인해서 재등록이 필요합니다
                </Text>
              </div>
            </div>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              다음 설정 저장
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
          <GlobalOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>
            <Text type="secondary">다음 서비스가 비활성화되어 있습니다.</Text>
            <br />
            <Text type="secondary">위의 스위치를 켜서 다음 설정을 활성화하세요.</Text>
          </div>
        </div>
      )}
    </Card>
  )
}

export default DaumSettings

import type { DaumConfig } from '../../api'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, message, Row, Switch, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

interface DaumSettingsProps {
  settings: DaumConfig
  onSave: (values: Partial<DaumConfig>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: Partial<DaumConfig>) => {
    try {
      await onSave(values)
      message.success('다음 설정이 저장되었습니다.')
    }
    catch (error) {
      message.error('다음 설정 저장에 실패했습니다.')
    }
  }

  return (
    <div>
      <Title level={3}>
        <span className="mr-2" style={{ color: '#0066cc' }}>🅳</span>
        다음 색인 설정
      </Title>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text strong className="text-lg">다음 색인 서비스</Text>
            <br />
            <Text type="secondary">다음 검색등록을 통한 URL 등록</Text>
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
        <Card title="사이트 설정" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="siteUrl"
                label="사이트 URL"
                help="다음에 등록할 웹사이트 주소"
                rules={[
                  { required: settings.use, message: '사이트 URL을 입력해주세요!' },
                  { type: 'url', message: '올바른 URL 형식이 아닙니다!' },
                ]}
              >
                <Input
                  placeholder="https://example.com"
                  disabled={!settings.use}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="PIN코드"
                help="다음 검색등록 시 설정한 PIN코드"
                rules={[
                  { required: settings.use, message: 'PIN코드를 입력해주세요!' },
                ]}
              >
                <Input.Password
                  placeholder="abc12345"
                  disabled={!settings.use}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="loginUrl"
                label="로그인 URL (선택사항)"
                help="특별한 로그인 URL이 있는 경우 입력해주세요"
              >
                <Input
                  placeholder="https://login.daum.net/accounts/loginform.do"
                  disabled={!settings.use}
                />
              </Form.Item>
            </Col>
          </Row>
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

export default DaumSettings

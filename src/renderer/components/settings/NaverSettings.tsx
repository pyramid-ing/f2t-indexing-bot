import React from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Row, Col } from 'antd'
import { GlobalOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface NaverEngineSettings {
  use: boolean
  naverId: string
  password: string
  headless: boolean
}

interface NaverSettingsProps {
  settings: NaverEngineSettings
  onSave: (values: Partial<NaverEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const NaverSettings: React.FC<NaverSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    try {
      // 프론트엔드의 `showBrowser` 값을 백엔드의 `headless` 값으로 변환
      const settingsToSave = {
        ...values,
        headless: !values.showBrowser,
      }
      delete settingsToSave.showBrowser

      await onSave(settingsToSave)
      message.success('네이버 설정이 저장되었습니다.')
    } catch (error) {
      message.error('네이버 설정 저장에 실패했습니다.')
    }
  }

  // 백엔드의 `headless` 값을 프론트엔드의 `showBrowser` 값으로 변환하여 Form에 설정
  const initialValues = {
    ...settings,
    showBrowser: !settings.headless,
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <GlobalOutlined style={{ color: '#03c75a', marginRight: 8 }} />
            네이버 설정
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
              네이버 서치어드바이저를 통해 URL을 네이버 검색엔진에 등록합니다.
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="naverId"
                  label="네이버 아이디"
                  help="네이버 서치어드바이저에 로그인할 아이디"
                  rules={[
                    { required: true, message: '네이버 아이디를 입력해주세요' },
                    { min: 3, message: '아이디는 최소 3자 이상이어야 합니다' },
                  ]}
                >
                  <Input placeholder="naverid" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="비밀번호"
                  help="네이버 계정 비밀번호"
                  rules={[
                    { required: true, message: '비밀번호를 입력해주세요' },
                    { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
                  ]}
                >
                  <Input.Password placeholder="••••••••" size="large" />
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
                📊 네이버 등록 제한사항
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • 하루 최대 50개 URL 등록 가능
                  <br />
                  • 크롤링 방식으로 실패하는 경우가 종종 있습니다. 이 경우 확인해서 재등록이 필요합니다
                  <br />• 주기적으로 수동 로그인이 필요합니다 (자동 로그인 제한)
                </Text>
              </div>
            </div>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              네이버 설정 저장
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
            <Text type="secondary">네이버 서비스가 비활성화되어 있습니다.</Text>
            <br />
            <Text type="secondary">위의 스위치를 켜서 네이버 설정을 활성화하세요.</Text>
          </div>
        </div>
      )}
    </Card>
  )
}

export default NaverSettings

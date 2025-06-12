import React from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Row, Col } from 'antd'
import { GlobalOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface NaverEngineSettings {
  use: boolean
  naverId: string
  password: string
}

interface NaverSettingsProps {
  settings: NaverEngineSettings
  onSave: (values: Partial<NaverEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const NaverSettings: React.FC<NaverSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: Partial<NaverEngineSettings>) => {
    try {
      await onSave(values)
      message.success('네이버 설정이 저장되었습니다.')
    } catch (error) {
      message.error('네이버 설정 저장에 실패했습니다.')
    }
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
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
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

            <div
              style={{
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text strong style={{ color: '#cf1322' }}>
                🔐 수동 로그인 필요
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  네이버는 보안상 캡챠 인증이 필요할 수 있습니다.
                  <br />
                  자동 로그인 시도 후 캡챠나 추가 인증이 요구되면 수동 로그인 창이 열립니다.
                  <br />
                  수동으로 로그인을 완료한 후 자동으로 세션이 저장됩니다.
                </Text>
              </div>
            </div>

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
                📋 네이버 서치어드바이저 설정
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  1.{' '}
                  <a href="https://searchadvisor.naver.com" target="_blank" rel="noopener noreferrer">
                    네이버 서치어드바이저
                  </a>
                  에 로그인
                  <br />
                  2. 웹사이트 등록 및 소유권 확인
                  <br />
                  3. 요청 {'>'} 수집요청에서 URL 등록 가능
                  <br />
                  4. 일일 등록 한도: 약 1,000개 URL
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
                ⚠️ 보안 주의사항
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • 계정 정보는 로컬에 암호화되어 저장됩니다
                  <br />
                  • 2단계 인증 활성화 시 앱 비밀번호를 사용하세요
                  <br />• 의심스러운 로그인 알림이 오면 정상적인 접근입니다
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

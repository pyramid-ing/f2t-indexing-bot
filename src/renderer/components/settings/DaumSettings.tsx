import React from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Row, Col } from 'antd'
import { GlobalOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface DaumEngineSettings {
  use: boolean
  siteUrl: string
  password: string
}

interface DaumSettingsProps {
  settings: DaumEngineSettings
  onSave: (values: Partial<DaumEngineSettings>) => Promise<void>
  onToggleUse: (checked: boolean) => Promise<void>
  loading: boolean
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ settings, onSave, onToggleUse, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: Partial<DaumEngineSettings>) => {
    try {
      await onSave(values)
      message.success('다음 설정이 저장되었습니다.')
    } catch (error) {
      message.error('다음 설정 저장에 실패했습니다.')
    }
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
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              다음 검색등록을 통해 URL을 다음 검색엔진에 등록합니다.
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="siteUrl"
                  label="사이트 URL"
                  help="다음 검색등록에 등록할 사이트 URL"
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
                  label="등록 비밀번호"
                  help="다음 검색등록 시 사용할 비밀번호 (4자리)"
                  rules={[
                    { required: true, message: '등록 비밀번호를 입력해주세요' },
                    { len: 4, message: '비밀번호는 정확히 4자리여야 합니다' },
                    { pattern: /^\d{4}$/, message: '숫자 4자리만 입력 가능합니다' },
                  ]}
                >
                  <Input.Password placeholder="1234" size="large" maxLength={4} />
                </Form.Item>
              </Col>
            </Row>

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
                📋 다음 검색등록 방법
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  1.{' '}
                  <a href="https://register.search.daum.net/index.daum" target="_blank" rel="noopener noreferrer">
                    다음 검색등록
                  </a>{' '}
                  페이지 방문
                  <br />
                  2. 사이트 등록 및 4자리 숫자 비밀번호 설정
                  <br />
                  3. 사이트 소유권 확인 (HTML 파일 업로드 또는 메타태그)
                  <br />
                  4. 승인 후 URL별 개별 등록 가능
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
                  • 다음은 사이트별 수동 승인 과정이 필요합니다
                  <br />
                  • 일일 등록 제한이 있을 수 있습니다
                  <br />
                  • 등록 후 검색 반영까지 시간이 걸립니다
                  <br />• 4자리 등록 비밀번호를 정확히 기억해야 합니다
                </Text>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text strong style={{ color: '#389e0d' }}>
                💡 팁
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • 사이트 등록 시 카테고리를 정확히 선택하세요
                  <br />
                  • 사이트맵(sitemap.xml)을 함께 제출하면 도움이 됩니다
                  <br />• 정기적으로 새 콘텐츠를 등록하여 활성도를 유지하세요
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

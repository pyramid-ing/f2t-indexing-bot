import type { DaumConfig } from '../../api'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, message, Row, Switch, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography

interface DaumSettingsProps {
  settings: DaumConfig
  onSave: (values: Partial<DaumConfig>) => Promise<void>
  loading: boolean
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ settings, onSave, loading }) => {
  const [form] = Form.useForm()
  const [localUse, setLocalUse] = React.useState(settings.use)

  // 설정이 변경되면 로컬 상태와 폼 값 업데이트
  React.useEffect(() => {
    setLocalUse(settings.use)
    form.setFieldsValue(settings)
  }, [settings, form])

  const handleSubmit = async (values: Partial<DaumConfig>) => {
    try {
      // use가 true인데 필수 필드가 비어있으면 저장 불가
      if (localUse) {
        if (!values.siteUrl) {
          message.error('사이트 URL을 입력해주세요.')
          return
        }
        if (!values.password) {
          message.error('PIN코드를 입력해주세요.')
          return
        }
        // URL 형식 검증
        try {
          new URL(values.siteUrl)
        } catch {
          message.error('올바른 URL 형식이 아닙니다.')
          return
        }
      }

      const finalValues = { ...values, use: localUse }
      await onSave(finalValues)
      message.success('다음 설정이 저장되었습니다.')
    } catch (error) {
      message.error('다음 설정 저장에 실패했습니다.')
    }
  }

  const handleUseToggle = (checked: boolean) => {
    setLocalUse(checked)
    // 바로 저장하지 않고 로컬 상태만 변경
  }

  return (
    <div>
      <Title level={3}>
        <span className="mr-2" style={{ color: '#0066cc' }}>
          🅳
        </span>
        다음 색인 설정
      </Title>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text strong className="text-lg">
              다음 색인 서비스
            </Text>
            <br />
            <Text type="secondary">다음 검색등록을 통한 URL 등록</Text>
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
        key={JSON.stringify(settings)}
      >
        <Card title="사이트 설정" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="siteUrl"
                label="사이트 URL"
                help="다음에 등록할 웹사이트 주소"
                rules={[
                  { required: localUse, message: '사이트 URL을 입력해주세요!' },
                  { type: 'url', message: '올바른 URL 형식이 아닙니다!' },
                ]}
              >
                <Input placeholder="https://example.com" disabled={!localUse} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="PIN코드"
                help="다음 검색등록 시 설정한 PIN코드"
                rules={[{ required: localUse, message: 'PIN코드를 입력해주세요!' }]}
              >
                <Input.Password placeholder="abc12345" disabled={!localUse} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="headless"
                label="창보기 모드"
                help="브라우저 창을 표시할지 여부 (체크 해제 시 브라우저 창 표시)"
                valuePropName="checked"
              >
                <Switch checkedChildren="숨김" unCheckedChildren="표시" disabled={!localUse} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            설정 저장
          </Button>
          {!localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#faad14' }}>
                위의 스위치를 켜고 사이트 URL과 PIN코드를 입력한 후 저장해주세요.
              </Text>
            </div>
          )}
          {localUse && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, color: '#1890ff' }}>
                사이트 URL과 PIN코드를 입력하고 저장 버튼을 눌러주세요.
              </Text>
            </div>
          )}
        </Form.Item>
      </Form>
    </div>
  )
}

export default DaumSettings

import type { AppSettings, SettingsComponentProps } from '../../types/settings'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, message, Row, Select, Space, Switch, Typography } from 'antd'
import React from 'react'

const { Title, Text } = Typography
const { Option } = Select

const GeneralSettings: React.FC<SettingsComponentProps<AppSettings>> = ({ settings, onSave, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: AppSettings) => {
    try {
      await onSave(values)
      message.success('일반 설정이 저장되었습니다.')
    } catch (error) {
      message.error('설정 저장에 실패했습니다.')
    }
  }

  const resetToDefaults = () => {
    const defaults: AppSettings = {
      appVersion: '1.0.0',
      initialized: true,
      setupCompleted: true,
      theme: 'light',
      language: 'ko',
      firstRun: false,
    }
    form.setFieldsValue(defaults)
    message.info('기본값으로 초기화되었습니다.')
  }

  return (
    <Card title="일반 설정" style={{ marginBottom: 24 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="appVersion" label="앱 버전" help="현재 애플리케이션 버전">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="language" label="언어" help="사용자 인터페이스 언어">
              <Select>
                <Option value="ko">한국어</Option>
                <Option value="en">English</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="theme" label="테마" help="애플리케이션 테마">
              <Select>
                <Option value="light">밝은 테마</Option>
                <Option value="dark">어두운 테마</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="initialized" label="초기화 상태" valuePropName="checked">
              <Switch checkedChildren="완료" unCheckedChildren="미완료" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="setupCompleted" label="설정 완료" valuePropName="checked">
              <Switch checkedChildren="완료" unCheckedChildren="미완료" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="firstRun" label="첫 실행" valuePropName="checked">
              <Switch checkedChildren="예" unCheckedChildren="아니오" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              일반 설정 저장
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetToDefaults}>
              기본값으로 초기화
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default GeneralSettings

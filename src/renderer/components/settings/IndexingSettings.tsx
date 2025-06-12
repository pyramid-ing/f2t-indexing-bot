import React from 'react'
import { Card, Form, Button, Switch, message, Typography, Space, Row, Col, InputNumber } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { IndexingSettings as IndexingSettingsType, SettingsComponentProps } from '../../types/settings'

const { Title, Text } = Typography

const IndexingSettings: React.FC<SettingsComponentProps<IndexingSettingsType>> = ({ settings, onSave, loading }) => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: IndexingSettingsType) => {
    try {
      await onSave(values)
      message.success('인덱싱 설정이 저장되었습니다.')
    } catch (error) {
      message.error('설정 저장에 실패했습니다.')
    }
  }

  const resetToDefaults = () => {
    const defaults: IndexingSettingsType = {
      defaultDelay: 2000,
      maxRetries: 3,
      batchSize: 10,
      enableLogging: true,
    }
    form.setFieldsValue(defaults)
    message.info('기본값으로 초기화되었습니다.')
  }

  return (
    <Card title="인덱싱 설정" style={{ marginBottom: 24 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={settings}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="defaultDelay"
              label="기본 지연시간 (ms)"
              help="각 요청 사이의 지연시간"
              rules={[
                { required: true, message: '지연시간을 입력해주세요' },
                { type: 'number', min: 500, max: 10000, message: '500ms~10000ms 사이의 값을 입력해주세요' },
              ]}
            >
              <InputNumber min={500} max={10000} step={500} style={{ width: '100%' }} placeholder="2000" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxRetries"
              label="최대 재시도 횟수"
              help="실패시 재시도할 최대 횟수"
              rules={[
                { required: true, message: '재시도 횟수를 입력해주세요' },
                { type: 'number', min: 1, max: 10, message: '1~10회 사이의 값을 입력해주세요' },
              ]}
            >
              <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="3" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="batchSize"
              label="배치 크기"
              help="한 번에 처리할 URL 개수"
              rules={[
                { required: true, message: '배치 크기를 입력해주세요' },
                { type: 'number', min: 1, max: 100, message: '1~100개 사이의 값을 입력해주세요' },
              ]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="10" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="enableLogging"
              label="로깅 활성화"
              help="인덱싱 과정의 로그를 기록합니다"
              valuePropName="checked"
            >
              <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
            </Form.Item>
          </Col>
        </Row>

        <div
          style={{
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text strong style={{ color: '#389e0d' }}>
            💡 인덱싱 성능 팁
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              • 지연시간을 너무 짧게 설정하면 API 제한에 걸릴 수 있습니다
              <br />
              • 배치 크기를 크게 하면 처리 속도는 빨라지지만 실패 시 영향이 큽니다
              <br />• 로깅을 활성화하면 문제 발생 시 원인 파악이 쉬워집니다
            </Text>
          </div>
        </div>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              인덱싱 설정 저장
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

export default IndexingSettings

import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface DaumSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site.daumConfig} onValuesChange={onValuesChange}>
      <Form.Item name="use" valuePropName="checked" label="Daum 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name="siteUrl" label="사이트 URL">
        <Input placeholder="https://example.com" />
      </Form.Item>

      <Form.Item name="loginUrl" label="로그인 URL">
        <Input placeholder="https://example.com/login" />
      </Form.Item>

      <Form.Item name="password" label="비밀번호">
        <Input.Password placeholder="비밀번호를 입력하세요" />
      </Form.Item>

      <Form.Item name="headless" valuePropName="checked" label="헤드리스 모드">
        <Switch />
      </Form.Item>
    </Form>
  )
}

export default DaumSettings

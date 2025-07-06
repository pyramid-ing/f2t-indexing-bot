import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface GoogleSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site.googleConfig} onValuesChange={onValuesChange}>
      <Form.Item name="use" valuePropName="checked" label="Google 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name="serviceAccountJson" label="서비스 계정 JSON">
        <Input.TextArea rows={10} placeholder="서비스 계정 JSON을 입력하세요" />
      </Form.Item>
    </Form>
  )
}

export default GoogleSettings

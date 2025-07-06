import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface BingSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const BingSettings: React.FC<BingSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site.bingConfig} onValuesChange={onValuesChange}>
      <Form.Item name="use" valuePropName="checked" label="Bing 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name="apiKey" label="API Key">
        <Input.Password placeholder="Bing API Key를 입력하세요" />
      </Form.Item>
    </Form>
  )
}

export default BingSettings

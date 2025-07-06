import React from 'react'
import { Form, Switch, Input } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface IndexingSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const IndexingSettings: React.FC<IndexingSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site.indexingConfig} onValuesChange={onValuesChange}>
      <Form.Item name="use" valuePropName="checked" label="인덱싱 사용">
        <Switch />
      </Form.Item>
      <Form.Item name="schedule" label="스케줄">
        <Input placeholder="* * * * *" />
      </Form.Item>
    </Form>
  )
}

export default IndexingSettings

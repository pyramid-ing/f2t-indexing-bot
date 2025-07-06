import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface SiteSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const SiteSettings: React.FC<SiteSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site} onValuesChange={onValuesChange}>
      <Form.Item name="isActive" valuePropName="checked" label="사이트 활성화">
        <Switch />
      </Form.Item>

      <Form.Item name="sitemap" label="사이트맵 URL">
        <Input placeholder="https://example.com/sitemap.xml" />
      </Form.Item>

      <Form.Item name="rss" label="RSS 피드 URL">
        <Input placeholder="https://example.com/feed.xml" />
      </Form.Item>
    </Form>
  )
}

export default SiteSettings

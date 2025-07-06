import React from 'react'
import { Form, Input } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface GeneralSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()

  return (
    <Form form={form} layout="vertical" initialValues={site} onValuesChange={onValuesChange}>
      <Form.Item name="name" label="사이트 이름" rules={[{ required: true, message: '사이트 이름을 입력해주세요' }]}>
        <Input />
      </Form.Item>

      <Form.Item name="domain" label="도메인" rules={[{ required: true, message: '도메인을 입력해주세요' }]}>
        <Input />
      </Form.Item>

      <Form.Item name="siteUrl" label="사이트 URL" rules={[{ required: true, message: '사이트 URL을 입력해주세요' }]}>
        <Input />
      </Form.Item>
    </Form>
  )
}

export default GeneralSettings

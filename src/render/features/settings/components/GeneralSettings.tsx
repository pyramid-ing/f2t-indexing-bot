import React from 'react'
import { Form, Input } from 'antd'
import { Site } from '@render/api/siteConfigApi'

interface GeneralSettingsProps {
  site: Site
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ site }) => {
  return (
    <div>
      <Form.Item
        name={['general', 'name']}
        label="사이트 이름"
        rules={[{ required: true, message: '사이트 이름을 입력해주세요' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name={['general', 'domain']}
        label="도메인"
        rules={[{ required: true, message: '도메인을 입력해주세요' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name={['general', 'siteUrl']}
        label="사이트 URL"
        rules={[{ required: true, message: '사이트 URL을 입력해주세요' }]}
      >
        <Input />
      </Form.Item>
    </div>
  )
}

export default GeneralSettings

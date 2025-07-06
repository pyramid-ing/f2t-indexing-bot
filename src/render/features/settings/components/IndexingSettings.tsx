import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface IndexingSettingsProps {
  site: Site
}

const IndexingSettings: React.FC<IndexingSettingsProps> = ({ site }) => {
  return (
    <div>
      <Form.Item name={['indexing', 'use']} valuePropName="checked" label="자동 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item
        name={['indexing', 'schedule']}
        label="인덱싱 스케줄 (Cron 표현식)"
        rules={[{ required: true, message: 'Cron 표현식을 입력해주세요' }]}
      >
        <Input placeholder="0 0 * * *" />
      </Form.Item>
    </div>
  )
}

export default IndexingSettings

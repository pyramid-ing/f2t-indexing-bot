import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface BingSettingsProps {
  site: Site
}

const BingSettings: React.FC<BingSettingsProps> = ({ site }) => {
  return (
    <>
      <Form.Item name={['bing', 'use']} valuePropName="checked" label="빙 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name={['bing', 'apiKey']} label="API 키">
        <Input.Password placeholder="API 키를 입력하세요" />
      </Form.Item>
    </>
  )
}

export default BingSettings

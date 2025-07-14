import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/siteConfigApi'

interface GoogleSettingsProps {
  site: Site
}

const GoogleSettings: React.FC<GoogleSettingsProps> = ({ site }) => {
  return (
    <>
      <Form.Item name={['google', 'use']} valuePropName="checked" label="구글 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name={['google', 'serviceAccountJson']} label="서비스 계정 JSON">
        <Input.TextArea rows={10} placeholder="서비스 계정 JSON을 입력하세요" />
      </Form.Item>
    </>
  )
}

export default GoogleSettings

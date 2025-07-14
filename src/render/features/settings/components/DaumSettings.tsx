import React from 'react'
import { Form, Input, Switch } from 'antd'
import { Site } from '@render/api/siteConfigApi'

interface DaumSettingsProps {
  site: Site
}

const DaumSettings: React.FC<DaumSettingsProps> = ({ site }) => {
  return (
    <>
      <Form.Item name={['daum', 'use']} valuePropName="checked" label="다음 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name={['daum', 'siteUrl']} label="사이트 URL">
        <Input placeholder="https://example.com" />
      </Form.Item>

      <Form.Item name={['daum', 'loginUrl']} label="로그인 URL">
        <Input placeholder="https://accounts.kakao.com/login" />
      </Form.Item>

      <Form.Item name={['daum', 'password']} label="비밀번호">
        <Input.Password />
      </Form.Item>

      <Form.Item name={['daum', 'headless']} valuePropName="checked" label="헤드리스 모드">
        <Switch />
      </Form.Item>
    </>
  )
}

export default DaumSettings

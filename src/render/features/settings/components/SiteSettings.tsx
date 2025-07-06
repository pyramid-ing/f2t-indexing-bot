import React from 'react'
import { Form, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'

interface SiteSettingsProps {
  site: Site
}

const SiteSettings: React.FC<SiteSettingsProps> = ({ site }) => {
  return (
    <div>
      <Form.Item name={['site', 'isActive']} valuePropName="checked" label="사이트 활성화">
        <Switch />
      </Form.Item>
    </div>
  )
}

export default SiteSettings

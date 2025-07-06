import React from 'react'
import { Form, Input, Select, Switch } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'
import { naverAccountApi } from '@render/api'

interface NaverSettingsProps {
  site: Site
  onValuesChange: (values: any) => void
}

const NaverSettings: React.FC<NaverSettingsProps> = ({ site, onValuesChange }) => {
  const [form] = Form.useForm()
  const [accounts, setAccounts] = React.useState<any[]>([])

  React.useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const data = await naverAccountApi.getAll()
      setAccounts(data)
    } catch (error) {
      console.error('네이버 계정 목록을 불러오는데 실패했습니다:', error)
    }
  }

  return (
    <Form form={form} layout="vertical" initialValues={site.naverConfig} onValuesChange={onValuesChange}>
      <Form.Item name="use" valuePropName="checked" label="Naver 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name="selectedNaverAccountId" label="네이버 계정">
        <Select placeholder="네이버 계정을 선택하세요">
          {accounts.map(account => (
            <Select.Option key={account.id} value={account.id}>
              {account.username}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="loginUrl" label="로그인 URL">
        <Input placeholder="https://example.com/login" />
      </Form.Item>

      <Form.Item name="headless" valuePropName="checked" label="헤드리스 모드">
        <Switch />
      </Form.Item>
    </Form>
  )
}

export default NaverSettings

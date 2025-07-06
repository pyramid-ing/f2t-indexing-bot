import React from 'react'
import { Form, Input, Select, Switch, Spin } from 'antd'
import { Site } from '@render/api/settings/siteConfigApi'
import { naverAccountApi } from '@render/api'
import { NaverAccount } from '@render/api/types'

interface NaverSettingsProps {
  site: Site
}

const NaverSettings: React.FC<NaverSettingsProps> = ({ site }) => {
  const [form] = Form.useForm()
  const [accounts, setAccounts] = React.useState<NaverAccount[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await naverAccountApi.getAll()
      setAccounts(data || [])
    } catch (error) {
      console.error('네이버 계정 목록을 불러오는데 실패했습니다:', error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const initialValues = {
    use: site.naverConfig?.use || false,
    selectedNaverAccountId: site.naverConfig?.selectedNaverAccountId,
    loginUrl: site.naverConfig?.loginUrl || '',
    headless: site.naverConfig?.headless || false,
  }

  return (
    <Form form={form} layout="vertical" initialValues={initialValues}>
      <Form.Item name={['naver', 'use']} valuePropName="checked" label="네이버 인덱싱 사용">
        <Switch />
      </Form.Item>

      <Form.Item name={['naver', 'selectedNaverAccountId']} label="네이버 계정">
        <Select
          placeholder="네이버 계정을 선택하세요"
          loading={loading}
          notFoundContent={loading ? <Spin size="small" /> : '등록된 계정이 없습니다'}
        >
          {accounts.map(account => (
            <Select.Option key={account.id} value={account.id}>
              {account.name} ({account.naverId})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name={['naver', 'loginUrl']} label="로그인 URL">
        <Input placeholder="https://nid.naver.com/nidlogin.login" />
      </Form.Item>

      <Form.Item name={['naver', 'headless']} valuePropName="checked" label="헤드리스 모드">
        <Switch />
      </Form.Item>
    </Form>
  )
}

export default NaverSettings

import React, { useEffect, useState } from 'react'
import { Typography, Select, Form, Input, Button, Space } from 'antd'
import {
  BingSettings,
  DaumSettings,
  GeneralSettings,
  GoogleSettings,
  IndexingSettings,
  NaverAccountManagement,
  NaverSettings,
  SiteSettings,
} from '@render/features/settings'
import { Site, siteConfigApi } from '@render/api/settings/siteConfigApi'

const { Title } = Typography

const Settings = () => {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const data = await siteConfigApi.getAll()
      setSites(data)
    } catch (error) {
      console.error('Failed to load sites:', error)
    }
  }

  const handleSiteSelect = async (siteId: number) => {
    try {
      const data = await siteConfigApi.getById(siteId)
      setSelectedSite(data)
    } catch (error) {
      console.error('Failed to load site:', error)
    }
  }

  const handleCreateSite = async (values: any) => {
    try {
      await siteConfigApi.create(values)
      await loadSites()
    } catch (error) {
      console.error('Failed to create site:', error)
    }
  }

  const handleUpdateSite = async (values: any) => {
    if (!selectedSite) return

    try {
      await siteConfigApi.update(selectedSite.id, values)
      await loadSites()
    } catch (error) {
      console.error('Failed to update site:', error)
    }
  }

  const handleUpdateEngineConfigs = async (configs: any) => {
    if (!selectedSite) return

    try {
      await siteConfigApi.update(selectedSite.id, configs)
      await loadSites()
    } catch (error) {
      console.error('Failed to update engine configs:', error)
    }
  }

  return (
    <div className="p-4">
      <Title level={2}>설정</Title>

      <div className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select placeholder="사이트 선택" style={{ width: 200 }} onChange={handleSiteSelect} value={selectedSite?.id}>
            {sites.map(site => (
              <Select.Option key={site.id} value={site.id}>
                {site.name}
              </Select.Option>
            ))}
          </Select>

          <Form form={form} onFinish={handleCreateSite} layout="vertical">
            <Form.Item
              name="name"
              label="사이트 이름"
              rules={[{ required: true, message: '사이트 이름을 입력해주세요' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="domain" label="도메인" rules={[{ required: true, message: '도메인을 입력해주세요' }]}>
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              사이트 추가
            </Button>
          </Form>
        </Space>
      </div>

      {selectedSite && (
        <div>
          <GeneralSettings site={selectedSite} onValuesChange={handleUpdateSite} />
          <SiteSettings site={selectedSite} onValuesChange={handleUpdateSite} />
          <IndexingSettings site={selectedSite} onValuesChange={handleUpdateEngineConfigs} />
          <GoogleSettings site={selectedSite} onValuesChange={handleUpdateEngineConfigs} />
          <NaverSettings site={selectedSite} onValuesChange={handleUpdateEngineConfigs} />
          <BingSettings site={selectedSite} onValuesChange={handleUpdateEngineConfigs} />
          <DaumSettings site={selectedSite} onValuesChange={handleUpdateEngineConfigs} />
          <NaverAccountManagement />
        </div>
      )}
    </div>
  )
}

export default Settings

import React, { useEffect, useState } from 'react'
import { Typography, Select, Form, Input, Button, Space, Card, Tabs, Modal, message } from 'antd'
import { PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  BingSettings,
  DaumSettings,
  GeneralSettings,
  GoogleSettings,
  NaverSettings,
  SiteSettings,
} from '@render/features/settings'
import { Site, siteConfigApi } from '@render/api/settings/siteConfigApi'

const { Title } = Typography
const { TabPane } = Tabs

interface AddSiteFormData {
  name: string
  domain: string
  siteUrl: string
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [addSiteForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsForm] = Form.useForm()

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    if (selectedSite) {
      settingsForm.setFieldsValue({
        general: {
          name: selectedSite.name,
          domain: selectedSite.domain,
          siteUrl: selectedSite.siteUrl,
        },
        site: {
          isActive: selectedSite.isActive,
        },
        naver: selectedSite.naverConfig,
        daum: selectedSite.daumConfig,
        google: selectedSite.googleConfig,
        bing: selectedSite.bingConfig,
      })
    }
  }, [selectedSite, settingsForm])

  const loadSites = async () => {
    try {
      const data = await siteConfigApi.getAll()
      setSites(data)
      if (data.length > 0) {
        setSelectedSite(data[0])
      }
    } catch (error) {
      console.error('Failed to load sites:', error)
    }
  }

  const handleSiteSelect = (siteId: number) => {
    const site = sites.find(s => s.id === siteId)
    if (site) {
      setSelectedSite(site)
      settingsForm.setFieldsValue({
        general: {
          name: site.name,
          domain: site.domain,
          siteUrl: site.siteUrl,
        },
        site: {
          isActive: site.isActive,
        },
        naver: site.naverConfig,
        daum: site.daumConfig,
        google: site.googleConfig,
        bing: site.bingConfig,
      })
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedSite) return
    try {
      setSavingSettings(true)
      const values = settingsForm.getFieldsValue()
      const updatedSite = await siteConfigApi.update(selectedSite.id, {
        ...selectedSite,
        ...values.general,
        isActive: values.site.isActive,
        naverConfig: values.naver,
        daumConfig: values.daum,
        googleConfig: values.google,
        bingConfig: values.bing,
      })
      setSelectedSite(updatedSite)
      const updatedSites = sites.map(site => (site.id === updatedSite.id ? updatedSite : site))
      setSites(updatedSites)
      message.success('설정이 저장되었습니다')
    } catch (error) {
      console.error('Failed to update site:', error)
      message.error('설정 저장에 실패했습니다')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddSite = async (values: AddSiteFormData) => {
    try {
      setLoading(true)
      await siteConfigApi.create({
        ...values,
        isActive: true,
        googleConfig: {
          use: false,
          serviceAccountJson: '',
        },
        naverConfig: {
          use: false,
          selectedNaverAccountId: undefined,
          loginUrl: '',
          headless: false,
        },
        daumConfig: {
          use: false,
          siteUrl: '',
          password: '',
          loginUrl: '',
          headless: false,
        },
        bingConfig: {
          use: false,
          apiKey: '',
        },
      })
      message.success('사이트가 추가되었습니다')
      setIsModalVisible(false)
      addSiteForm.resetFields()
      await loadSites()
    } catch (error) {
      console.error('Failed to create site:', error)
      message.error('사이트 추가에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>설정</Title>
        <Space>
          <Select style={{ width: 200 }} placeholder="사이트 선택" value={selectedSite?.id} onChange={handleSiteSelect}>
            {sites.map(site => (
              <Select.Option key={site.id} value={site.id}>
                {site.name}
              </Select.Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            사이트 추가
          </Button>
        </Space>
      </div>

      {selectedSite && (
        <Form form={settingsForm} layout="vertical">
          <div className="flex justify-between items-center mb-4">
            <Tabs defaultActiveKey="general" type="card" className="flex-1">
              <TabPane tab="일반" key="general">
                <Card>
                  <GeneralSettings site={selectedSite} />
                </Card>
                <Card className="mt-4">
                  <SiteSettings site={selectedSite} />
                </Card>
              </TabPane>

              <TabPane tab="네이버" key="naver">
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <Title level={4}>네이버 설정</Title>
                    <Button type="primary" onClick={() => navigate('/naver-accounts')}>
                      계정 관리
                    </Button>
                  </div>
                  <NaverSettings site={selectedSite} />
                </Card>
              </TabPane>

              <TabPane tab="다음" key="daum">
                <Card>
                  <DaumSettings site={selectedSite} />
                </Card>
              </TabPane>

              <TabPane tab="구글" key="google">
                <Card>
                  <GoogleSettings site={selectedSite} />
                </Card>
              </TabPane>

              <TabPane tab="빙" key="bing">
                <Card>
                  <BingSettings site={selectedSite} />
                </Card>
              </TabPane>
            </Tabs>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={savingSettings}
              onClick={handleSaveSettings}
              style={{ marginLeft: '16px' }}
            >
              저장
            </Button>
          </div>
        </Form>
      )}

      <Modal
        title="새 사이트 추가"
        open={isModalVisible}
        onOk={addSiteForm.submit}
        onCancel={() => {
          setIsModalVisible(false)
          addSiteForm.resetFields()
        }}
        confirmLoading={loading}
      >
        <Form form={addSiteForm} layout="vertical" onFinish={handleAddSite}>
          <Form.Item
            name="name"
            label="사이트 이름"
            rules={[{ required: true, message: '사이트 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 내 블로그" />
          </Form.Item>

          <Form.Item name="domain" label="도메인" rules={[{ required: true, message: '도메인을 입력해주세요' }]}>
            <Input placeholder="예: example.com" />
          </Form.Item>

          <Form.Item
            name="siteUrl"
            label="사이트 URL"
            rules={[
              { required: true, message: '사이트 URL을 입력해주세요' },
              { type: 'url', message: '올바른 URL 형식을 입력해주세요' },
            ]}
          >
            <Input placeholder="예: https://example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SettingsPage

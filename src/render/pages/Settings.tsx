import React, { useEffect, useState } from 'react'
import { Typography, Select, Form, Input, Button, Space, Card, Tabs, Modal, message, Switch } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { BingSettings, DaumSettings, GeneralSettings, GoogleSettings, NaverSettings } from '@render/features/settings'
import { getAllSites, createSite, updateSite, Site } from '@render/api/siteConfigApi'

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
    fetchSites()
  }, [])

  const setFormWithSite = (site: Site) => {
    const defaultNaverConfig = { use: false, selectedNaverAccountId: undefined, loginUrl: '', headless: false }
    const defaultDaumConfig = { use: false, siteUrl: '', loginUrl: '', password: '', headless: false }
    const defaultGoogleConfig = { use: false, serviceAccountJson: '' }
    const defaultBingConfig = { use: false, apiKey: '' }
    settingsForm.resetFields()
    settingsForm.setFieldsValue({
      general: {
        name: site.name,
        domain: site.domain,
        siteUrl: site.siteUrl,
      },
      site: {
        isActive: site.isActive ?? true,
      },
      naver: {
        ...defaultNaverConfig,
        ...site.naverConfig,
      },
      daum: {
        ...defaultDaumConfig,
        ...site.daumConfig,
      },
      google: {
        ...defaultGoogleConfig,
        ...site.googleConfig,
      },
      bing: {
        ...defaultBingConfig,
        ...site.bingConfig,
      },
    })
  }

  const handleSiteSelect = (site: Site) => {
    setSelectedSite(site)
    setFormWithSite(site)
  }

  const fetchSites = async () => {
    try {
      setLoading(true)
      const data = await getAllSites()
      const siteList = Array.isArray(data) ? data : []
      setSites(siteList)
      if (siteList.length > 0) {
        handleSiteSelect(siteList[0])
      }
    } catch (error) {
      console.error('Failed to load sites:', error)
      message.error('사이트 목록을 불러오는데 실패했습니다.')
      setSites([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: any) => {
    if (!selectedSite) return

    try {
      setLoading(true)
      await updateSite(selectedSite.id, {
        name: values.general.name,
        domain: values.general.domain,
        siteUrl: values.general.siteUrl,
        isActive: values.site.isActive,
        naverConfig: values.naver,
        daumConfig: values.daum,
        googleConfig: values.google,
        bingConfig: values.bing,
      })
      message.success('설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save settings:', error)
      message.error('설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSite = async (values: AddSiteFormData) => {
    try {
      setLoading(true)
      await createSite({
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
      await fetchSites()
    } catch (error) {
      console.error('Failed to create site:', error)
      message.error('사이트 추가에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const items = selectedSite
    ? [
        {
          key: 'general',
          label: '일반',
          children: (
            <>
              <Form.Item name={['site', 'isActive']} valuePropName="checked" label="사이트 활성화">
                <Switch />
              </Form.Item>
              <GeneralSettings site={selectedSite} />
            </>
          ),
        },
        {
          key: 'naver',
          label: '네이버',
          children: <NaverSettings site={selectedSite} />,
        },
        {
          key: 'daum',
          label: '다음',
          children: <DaumSettings site={selectedSite} />,
        },
        {
          key: 'google',
          label: '구글',
          children: <GoogleSettings site={selectedSite} />,
        },
        {
          key: 'bing',
          label: '빙',
          children: <BingSettings site={selectedSite} />,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>설정</Title>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="사이트 선택"
            value={selectedSite?.id}
            onChange={id => {
              const site = sites.find(s => s.id === id)
              if (site) handleSiteSelect(site)
            }}
            options={
              sites?.map(site => ({
                label: site.name,
                value: site.id,
              })) || []
            }
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            사이트 추가
          </Button>
        </Space>
      </div>

      <Card>
        <Form form={settingsForm} onFinish={handleSave} disabled={loading} layout="vertical">
          <Tabs items={items} type="card" />
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              저장
            </Button>
          </Form.Item>
        </Form>
      </Card>

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

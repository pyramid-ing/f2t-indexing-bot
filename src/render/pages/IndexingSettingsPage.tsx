import React, { useEffect, useState } from 'react'
import { Typography, Select, Form, Button, Space, Card, Tabs, Modal, message, Switch, Input } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { BingSettings, DaumSettings, GeneralSettings, GoogleSettings, NaverSettings } from '@render/features/settings'
import { SitemapSettings } from '@render/features/settings/components/SitemapSettings'
import { getAllSites, createSite, updateSite, deleteSite, Site } from '@render/api/siteConfigApi'

const { Title } = Typography
const { TabPane } = Tabs

interface AddSiteFormData {
  name: string
  domain: string
  siteUrl: string
}

const IndexingSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null)
  const [addSiteForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [settingsForm] = Form.useForm()

  useEffect(() => {
    fetchSites()
  }, [])

  const setFormWithSite = (site: Site) => {
    const defaultNaverConfig = { use: false, selectedNaverAccountId: undefined, headless: false }
    const defaultDaumConfig = { use: false, siteUrl: '', password: '', headless: false }
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
      } else {
        setSelectedSite(null)
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
      message.success('인덱싱 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Failed to save settings:', error)
      message.error('인덱싱 설정 저장에 실패했습니다.')
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
          headless: false,
        },
        daumConfig: {
          use: false,
          siteUrl: '',
          password: '',
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

  const handleDeleteSite = async () => {
    if (!siteToDelete) return

    try {
      setLoading(true)
      await deleteSite(siteToDelete.id)
      message.success('사이트가 삭제되었습니다')
      setIsDeleteModalVisible(false)
      setSiteToDelete(null)
      await fetchSites()
    } catch (error) {
      console.error('Failed to delete site:', error)
      message.error('사이트 삭제에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const showDeleteModal = (site: Site) => {
    setSiteToDelete(site)
    setIsDeleteModalVisible(true)
  }

  const indexingItems = selectedSite
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
          key: 'sitemap',
          label: 'Sitemap',
          children: <SitemapSettings siteId={selectedSite.id} />,
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
        <Title level={2}>인덱싱 설정</Title>
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
          {selectedSite && (
            <Button danger icon={<DeleteOutlined />} onClick={() => showDeleteModal(selectedSite)} disabled={loading}>
              사이트 제거
            </Button>
          )}
        </Space>
      </div>

      {selectedSite ? (
        <Card>
          <Form form={settingsForm} onFinish={handleSave} disabled={loading} layout="vertical">
            <Tabs items={indexingItems} type="card" />
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                인덱싱 설정 저장
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-8 text-gray-500">사이트를 선택하거나 추가해주세요.</div>
        </Card>
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

      <Modal
        title="사이트 삭제 확인"
        open={isDeleteModalVisible}
        onOk={handleDeleteSite}
        onCancel={() => {
          setIsDeleteModalVisible(false)
          setSiteToDelete(null)
        }}
        confirmLoading={loading}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <p>
          <strong>{siteToDelete?.name}</strong> 사이트를 삭제하시겠습니까?
        </p>
        <p className="text-gray-500 text-sm mt-2">
          이 작업은 되돌릴 수 없으며, 해당 사이트의 모든 설정과 데이터가 영구적으로 삭제됩니다.
        </p>
      </Modal>
    </div>
  )
}

export default IndexingSettingsPage

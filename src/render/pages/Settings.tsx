import type { BingConfig, DaumConfig, GoogleConfig, NaverConfig, SiteConfig } from '../api'
import { SettingOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message, Modal, Select, Space, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { createSiteConfig, getAllSiteConfigs, getSiteConfig, updateSiteConfig, updateSiteEngineConfigs } from '../api'
import BingSettings from '../components/settings/BingSettings'
import DaumSettings from '../components/settings/DaumSettings'
import GoogleSettings from '../components/settings/GoogleSettings'
import NaverAccountManagement from '../components/settings/NaverAccountManagement'
import NaverSettings from '../components/settings/NaverSettings'

const { Title } = Typography
const { Option } = Select

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('naver-accounts')
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [selectedSite, setSelectedSite] = useState<SiteConfig | null>(null)
  const [newSiteModalVisible, setNewSiteModalVisible] = useState(false)
  const [editSiteModalVisible, setEditSiteModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  // 선택된 사이트의 검색엔진별 설정
  const [engineSettings, setEngineSettings] = useState<{
    google: GoogleConfig
    bing: BingConfig
    naver: NaverConfig
    daum: DaumConfig
  }>({
    google: {
      use: false,
      serviceAccountJson: '',
    },
    bing: {
      use: false,
      apiKey: '',
    },
    naver: {
      use: false,
      selectedNaverAccountId: undefined,
      loginUrl: '',
      headless: true,
    },
    daum: {
      use: false,
      siteUrl: '',
      password: '',
      loginUrl: '',
      headless: true,
    },
  })

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    if (selectedSiteId) {
      loadSiteSettings(selectedSiteId)
    }
  }, [selectedSiteId])

  const loadSites = async () => {
    try {
      setLoading(true)
      const response = await getAllSiteConfigs()
      if (response.success && response.data) {
        setSites(response.data)
        if (response.data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(response.data[0].id)
        }
      }
    } catch (error) {
      console.error('사이트 목록 로드 실패:', error)
      message.error('사이트 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadSiteSettings = async (siteId: number) => {
    try {
      setLoading(true)
      const response = await getSiteConfig(siteId)
      if (response.success && response.data) {
        setSelectedSite(response.data)

        const newEngineSettings = {
          google: response.data.googleConfig || {
            use: false,
            serviceAccountJson: '',
          },
          bing: response.data.bingConfig || {
            use: false,
            apiKey: '',
          },
          naver: response.data.naverConfig || {
            use: false,
            selectedNaverAccountId: undefined,
            loginUrl: '',
            headless: true,
          },
          daum: response.data.daumConfig || {
            use: false,
            siteUrl: '',
            password: '',
            loginUrl: '',
            headless: true,
          },
        }

        setEngineSettings(newEngineSettings)
      }
    } catch (error) {
      console.error('사이트 설정 로드 실패:', error)
      message.error('사이트 설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveEngineConfig = async (engine: 'google' | 'bing' | 'naver' | 'daum', config: any) => {
    if (!selectedSiteId) {
      message.error('사이트를 선택해주세요.')
      return
    }

    try {
      setLoading(true)
      const configs = { [engine]: config }
      await updateSiteEngineConfigs(selectedSiteId, configs)

      setEngineSettings(prev => ({
        ...prev,
        [engine]: config,
      }))

      message.success(`${engine.toUpperCase()} 설정이 저장되었습니다.`)
    } catch (error) {
      console.error(`${engine} 설정 저장 실패:`, error)
      message.error(`${engine.toUpperCase()} 설정 저장에 실패했습니다.`)
    } finally {
      setLoading(false)
    }
  }

  const saveGoogleSettings = async (settings: Partial<GoogleConfig>) => {
    const config = { ...engineSettings.google, ...settings }
    await saveEngineConfig('google', config)
  }

  const saveBingSettings = async (settings: Partial<BingConfig>) => {
    const config = { ...engineSettings.bing, ...settings }
    await saveEngineConfig('bing', config)
  }

  const saveNaverSettings = async (settings: Partial<NaverConfig>) => {
    const config = { ...engineSettings.naver, ...settings }
    await saveEngineConfig('naver', config)
  }

  const saveDaumSettings = async (settings: Partial<DaumConfig>) => {
    const config = { ...engineSettings.daum, ...settings }
    await saveEngineConfig('daum', config)
  }

  const handleNewSite = async (values: any) => {
    try {
      setLoading(true)
      const siteData: SiteConfig = {
        domain: values.domain,
        name: values.name,
        siteUrl: values.siteUrl,
        isActive: true,
      }

      const response = await createSiteConfig(siteData)
      if (response.success) {
        message.success('새 사이트가 추가되었습니다.')
        setNewSiteModalVisible(false)
        form.resetFields()
        await loadSites()
        if (response.data?.id) {
          setSelectedSiteId(response.data.id)
        }
      }
    } catch (error) {
      console.error('사이트 생성 실패:', error)
      message.error('사이트 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSite = () => {
    if (!selectedSite) {
      message.error('수정할 사이트를 선택해주세요.')
      return
    }
    editForm.setFieldsValue({
      name: selectedSite.name,
      siteUrl: selectedSite.siteUrl,
      domain: selectedSite.domain,
    })
    setEditSiteModalVisible(true)
  }

  const handleUpdateSite = async (values: any) => {
    if (!selectedSite) return

    try {
      setLoading(true)
      const siteData: SiteConfig = {
        domain: values.domain,
        name: values.name,
        siteUrl: values.siteUrl,
        isActive: selectedSite.isActive,
      }

      await updateSiteConfig(selectedSite.id!, siteData)
      message.success('사이트 정보가 수정되었습니다.')
      setEditSiteModalVisible(false)
      editForm.resetFields()
      await loadSites()
      await loadSiteSettings(selectedSite.id!)
    } catch (error) {
      console.error('사이트 수정 실패:', error)
      message.error('사이트 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2} className="flex items-center gap-2">
          <SettingOutlined />
          설정 관리
        </Title>
      </div>

      {/* 사이트 선택 영역 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <Space size="large">
            <span className="text-lg font-medium">사이트 선택:</span>
            <Select
              style={{ width: 300 }}
              placeholder="사이트를 선택하세요"
              value={selectedSiteId}
              onChange={setSelectedSiteId}
              loading={loading}
            >
              {sites.map(site => (
                <Option key={site.id} value={site.id}>
                  {site.name} ({site.domain})
                </Option>
              ))}
            </Select>
          </Space>
          <Space>
            <Button icon={<EditOutlined />} onClick={handleEditSite} disabled={!selectedSite}>
              수정
            </Button>
            <Button type="primary" onClick={() => setNewSiteModalVisible(true)}>
              새 사이트 추가
            </Button>
          </Space>
        </div>
        {selectedSite && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>사이트명:</strong> {selectedSite.name}
              </div>
              <div>
                <strong>도메인:</strong> {selectedSite.domain}
              </div>
              <div>
                <strong>URL:</strong> {selectedSite.siteUrl}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={[
            {
              key: 'naver-accounts',
              label: '네이버 계정 관리',
              children: <NaverAccountManagement />,
            },
            {
              key: 'google',
              label: 'Google',
              disabled: !selectedSiteId,
              children: (
                <GoogleSettings
                  key={selectedSiteId}
                  settings={engineSettings.google}
                  onSave={saveGoogleSettings}
                  loading={loading}
                />
              ),
            },
            {
              key: 'bing',
              label: 'Bing',
              disabled: !selectedSiteId,
              children: (
                <BingSettings
                  key={selectedSiteId}
                  settings={engineSettings.bing}
                  onSave={saveBingSettings}
                  loading={loading}
                />
              ),
            },
            {
              key: 'naver',
              label: '네이버',
              disabled: !selectedSiteId,
              children: (
                <NaverSettings
                  key={selectedSiteId}
                  settings={engineSettings.naver}
                  onSave={saveNaverSettings}
                  loading={loading}
                />
              ),
            },
            {
              key: 'daum',
              label: '다음',
              disabled: !selectedSiteId,
              children: (
                <DaumSettings
                  key={selectedSiteId}
                  settings={engineSettings.daum}
                  onSave={saveDaumSettings}
                  loading={loading}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 새 사이트 추가 모달 */}
      <Modal
        title="새 사이트 추가"
        open={newSiteModalVisible}
        onCancel={() => {
          setNewSiteModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleNewSite} layout="vertical">
          <Form.Item name="name" label="사이트명" rules={[{ required: true, message: '사이트명을 입력해주세요!' }]}>
            <Input placeholder="예: 내 블로그" />
          </Form.Item>
          <Form.Item
            name="siteUrl"
            label="사이트 URL"
            rules={[
              { required: true, message: '사이트 URL을 입력해주세요!' },
              { type: 'url', message: '올바른 URL 형식을 입력해주세요!' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="domain" label="도메인" rules={[{ required: true, message: '도메인을 입력해주세요!' }]}>
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                추가
              </Button>
              <Button
                onClick={() => {
                  setNewSiteModalVisible(false)
                  form.resetFields()
                }}
              >
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 사이트 수정 모달 */}
      <Modal
        title="사이트 수정"
        open={editSiteModalVisible}
        onCancel={() => {
          setEditSiteModalVisible(false)
          editForm.resetFields()
        }}
        footer={null}
      >
        <Form form={editForm} onFinish={handleUpdateSite} layout="vertical">
          <Form.Item name="name" label="사이트명" rules={[{ required: true, message: '사이트명을 입력해주세요!' }]}>
            <Input placeholder="예: 내 블로그" />
          </Form.Item>
          <Form.Item
            name="siteUrl"
            label="사이트 URL"
            rules={[
              { required: true, message: '사이트 URL을 입력해주세요!' },
              { type: 'url', message: '올바른 URL 형식을 입력해주세요!' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="domain" label="도메인" rules={[{ required: true, message: '도메인을 입력해주세요!' }]}>
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                수정
              </Button>
              <Button
                onClick={() => {
                  setEditSiteModalVisible(false)
                  editForm.resetFields()
                }}
              >
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settings

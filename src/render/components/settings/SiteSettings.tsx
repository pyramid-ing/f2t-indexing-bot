import type { SiteConfig } from '../../api'
import { DeleteOutlined, EditOutlined, GlobalOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message, Modal, Popconfirm, Space, Table, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import {
  createSiteConfig,
  deleteSiteConfig,
  getAllSiteConfigs,
  getErrorDetails,
  getErrorMessage,
  updateSiteConfig,
} from '../../api'

const { Title } = Typography

const SiteSettings: React.FC = () => {
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      setLoading(true)
      const response = await getAllSiteConfigs()
      setSites(response.data || [])
    } catch (error) {
      console.error('사이트 목록 로드 실패:', error)
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingSite(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (site: SiteConfig) => {
    setEditingSite(site)
    form.setFieldsValue(site)
    setModalVisible(true)
  }

  const handleDelete = async (siteId: number) => {
    try {
      await deleteSiteConfig(siteId)
      message.success('사이트가 삭제되었습니다.')
      loadSites()
    } catch (error) {
      console.error('사이트 삭제 실패:', error)
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    }
  }

  const handleSave = async (values: any) => {
    try {
      // URL에서 도메인 추출
      const extractDomain = (url: string) => {
        try {
          const urlObj = new URL(url)
          return urlObj.hostname.replace('www.', '')
        } catch {
          return url.replace('www.', '')
        }
      }

      const siteData: SiteConfig = {
        domain: extractDomain(values.siteUrl),
        name: values.name,
        siteUrl: values.siteUrl,
        isActive: true,
      }

      if (editingSite) {
        await updateSiteConfig(editingSite.id!, siteData)
        message.success('사이트가 수정되었습니다.')
      } else {
        await createSiteConfig(siteData)
        message.success('사이트가 추가되었습니다.')
      }

      setModalVisible(false)
      loadSites()
    } catch (error) {
      console.error('사이트 저장 실패:', error)
      const errorMessage = getErrorMessage(error)
      const errorDetails = getErrorDetails(error)

      let displayMessage = errorMessage
      if (errorDetails) {
        displayMessage += ` (${errorDetails})`
      }

      message.error(displayMessage)
    }
  }

  const columns = [
    {
      title: '사이트 이름',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: SiteConfig) => (
        <a href={record.siteUrl} target="_blank" rel="noopener noreferrer">
          <GlobalOutlined style={{ marginRight: 8 }} />
          {name}
        </a>
      ),
    },
    {
      title: '사이트 URL',
      dataIndex: 'siteUrl',
      key: 'siteUrl',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (record: SiteConfig) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card title="사이트 관리" style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          사이트 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={sites}
        rowKey="siteUrl"
        loading={loading}
        locale={{ emptyText: '등록된 사이트가 없습니다.' }}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingSite ? '사이트 수정' : '사이트 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="사이트 이름"
            rules={[{ required: true, message: '사이트 이름을 입력해주세요' }]}
          >
            <Input placeholder="내 블로그" size="large" />
          </Form.Item>

          <Form.Item
            name="siteUrl"
            label="사이트 URL"
            rules={[
              { required: true, message: '사이트 URL을 입력해주세요' },
              { type: 'url', message: '올바른 URL 형식을 입력해주세요' },
            ]}
          >
            <Input placeholder="https://example.com" disabled={!!editingSite} size="large" />
          </Form.Item>

          <div
            style={{
              backgroundColor: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Typography.Text strong style={{ color: '#0050b3' }}>
              💡 사이트 등록 안내
            </Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                • 블로그 타입에 관계없이 URL만으로 사이트를 관리합니다
                <br />
                • 인덱싱할 URL은 인덱싱 실행 시점에 입력하므로 미리 설정할 필요가 없습니다
                <br />• 검색엔진별 상세 설정은 각 엔진 탭에서 전역으로 관리됩니다
              </Typography.Text>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit">
                {editingSite ? '수정' : '추가'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Card>
  )
}

export default SiteSettings

import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined } from '@ant-design/icons'
import {
  getAllSiteConfigs,
  createSiteConfig,
  updateSiteConfig,
  deleteSiteConfig,
  SiteConfig,
  getErrorMessage,
  getErrorDetails,
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

  const handleDelete = async (siteUrl: string) => {
    try {
      await deleteSiteConfig(siteUrl)
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
      const siteData: SiteConfig = {
        siteUrl: values.siteUrl,
      }

      if (editingSite) {
        await updateSiteConfig(editingSite.siteUrl, siteData)
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
      title: '사이트 URL',
      dataIndex: 'siteUrl',
      key: 'siteUrl',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <GlobalOutlined style={{ marginRight: 8 }} />
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
            onConfirm={() => handleDelete(record.siteUrl)}
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

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Tabs,
  Alert,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined } from '@ant-design/icons'
import { getAllSiteConfigs, createSiteConfig, updateSiteConfig, deleteSiteConfig, SiteConfig } from '../api'

const { Title } = Typography
const { TextArea } = Input
const { TabPane } = Tabs

const SiteManagement: React.FC = () => {
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
      message.error('사이트 목록을 불러오는데 실패했습니다.')
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
    form.setFieldsValue({
      ...site,
      indexingUrls: site.indexingUrls.join('\n'),
    })
    setModalVisible(true)
  }

  const handleDelete = async (siteUrl: string) => {
    try {
      await deleteSiteConfig(siteUrl)
      message.success('사이트가 삭제되었습니다.')
      loadSites()
    } catch (error) {
      console.error('사이트 삭제 실패:', error)
      message.error('사이트 삭제에 실패했습니다.')
    }
  }

  const handleSave = async (values: any) => {
    try {
      const siteData: SiteConfig = {
        ...values,
        indexingUrls: values.indexingUrls.split('\n').filter((url: string) => url.trim()),
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
      message.error('사이트 저장에 실패했습니다.')
    }
  }

  const columns = [
    {
      title: '사이트 URL',
      dataIndex: 'siteUrl',
      key: 'siteUrl',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <GlobalOutlined /> {url}
        </a>
      ),
    },
    {
      title: '블로그 타입',
      dataIndex: 'blogType',
      key: 'blogType',
      render: (type: string) => {
        const colors = {
          TISTORY: 'orange',
          BLOGGER: 'blue',
          WORDPRESS: 'green',
        }
        return <Tag color={colors[type as keyof typeof colors]}>{type}</Tag>
      },
    },
    {
      title: 'URL 개수',
      key: 'urlCount',
      render: (record: SiteConfig) => record.indexingUrls.length,
    },
    {
      title: '작업',
      key: 'actions',
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
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3}>사이트 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          사이트 추가
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={sites}
          rowKey="siteUrl"
          loading={loading}
          locale={{ emptyText: '등록된 사이트가 없습니다.' }}
        />
      </Card>

      <Modal
        title={editingSite ? '사이트 수정' : '사이트 추가'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="siteUrl"
            label="사이트 URL"
            rules={[{ required: true, message: '사이트 URL을 입력해주세요' }]}
          >
            <Input placeholder="https://example.com" disabled={!!editingSite} />
          </Form.Item>

          <Form.Item
            name="blogType"
            label="블로그 타입"
            rules={[{ required: true, message: '블로그 타입을 선택해주세요' }]}
          >
            <Select placeholder="블로그 타입 선택">
              <Select.Option value="TISTORY">티스토리</Select.Option>
              <Select.Option value="BLOGGER">블로거</Select.Option>
              <Select.Option value="WORDPRESS">워드프레스</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="indexingUrls"
            label="인덱싱 URL 목록"
            rules={[{ required: true, message: '최소 하나의 URL을 입력해주세요' }]}
          >
            <TextArea
              rows={6}
              placeholder={`한 줄에 하나씩 URL을 입력해주세요.\n예시:\nhttps://example.com/post1\nhttps://example.com/post2`}
            />
          </Form.Item>

          <Tabs defaultActiveKey="basic">
            <TabPane tab="기본 설정" key="basic">
              <Alert
                message="검색엔진 설정 안내"
                description="검색엔진별 상세 설정(Google, Bing, Naver, Daum)은 '설정' 메뉴의 '검색엔진 설정'에서 전역으로 관리됩니다. 사이트별로 개별 설정할 필요가 없습니다."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </TabPane>
          </Tabs>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit">
                {editingSite ? '수정' : '추가'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default SiteManagement

import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Select,
  Space,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Checkbox,
} from 'antd'
import { PlayCircleOutlined, ReloadOutlined, GoogleOutlined, YahooOutlined, GlobalOutlined } from '@ant-design/icons'
import {
  getAllSiteConfigs,
  bingManualIndex,
  googleManualIndex,
  naverManualIndex,
  daumManualIndex,
  SiteConfig,
} from '../api'

const { Title, Text } = Typography
const { TextArea } = Input

interface IndexingTask {
  id: string
  siteUrl: string
  urls: string[]
  services: ('bing' | 'google' | 'naver' | 'daum')[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: Record<string, any>
}

const IndexingDashboard: React.FC = () => {
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [indexingTasks, setIndexingTasks] = useState<IndexingTask[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const data = await getAllSiteConfigs()
      setSites(data)
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].siteUrl)
      }
    } catch (error) {
      console.error('사이트 목록 로드 실패:', error)
      message.error('사이트 목록을 불러오는데 실패했습니다.')
    }
  }

  const getSelectedSiteConfig = () => {
    return sites.find(site => site.siteUrl === selectedSite)
  }

  const handleManualIndexing = () => {
    const siteConfig = getSelectedSiteConfig()
    if (!siteConfig) {
      message.error('사이트를 선택해주세요.')
      return
    }

    form.setFieldsValue({
      urls: siteConfig.indexingUrls.join('\n'),
      services: getAvailableServices(siteConfig),
    })
    setModalVisible(true)
  }

  const getAvailableServices = (siteConfig: SiteConfig) => {
    const services = []
    if (siteConfig.bing?.use) services.push('bing')
    if (siteConfig.google?.use) services.push('google')
    if (siteConfig.naver?.use) services.push('naver')
    if (siteConfig.daum?.use) services.push('daum')
    return services
  }

  const executeIndexing = async (values: any) => {
    const siteConfig = getSelectedSiteConfig()
    if (!siteConfig) return

    const urls = values.urls.split('\n').filter((url: string) => url.trim())
    const services = values.services || []

    const taskId = Date.now().toString()
    const task: IndexingTask = {
      id: taskId,
      siteUrl: siteConfig.siteUrl,
      urls,
      services,
      status: 'running',
    }

    setIndexingTasks(prev => [task, ...prev])
    setModalVisible(false)
    setLoading(true)

    const results: Record<string, any> = {}

    try {
      for (const service of services) {
        try {
          let result
          switch (service) {
            case 'bing':
              result = await bingManualIndex({
                siteUrl: siteConfig.siteUrl,
                urls,
              })
              break
            case 'google':
              result = await googleManualIndex({
                siteUrl: siteConfig.siteUrl,
                urls,
                type: 'URL_UPDATED',
              })
              break
            case 'naver':
              result = await naverManualIndex({
                siteUrl: siteConfig.siteUrl,
                urlsToIndex: urls,
              })
              break
            case 'daum':
              result = await daumManualIndex({
                siteUrl: siteConfig.siteUrl,
                urlsToIndex: urls,
              })
              break
          }
          results[service] = { status: 'success', data: result }
        } catch (error) {
          results[service] = { status: 'failed', error: error.message }
        }
      }

      // 작업 완료 업데이트
      setIndexingTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'completed', results } : t)))

      message.success('인덱싱 작업이 완료되었습니다.')
    } catch (error) {
      setIndexingTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'failed', results } : t)))
      message.error('인덱싱 작업 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'google':
        return <GoogleOutlined style={{ color: '#4285f4' }} />
      case 'bing':
        return <YahooOutlined style={{ color: '#00809d' }} />
      case 'naver':
        return <GlobalOutlined style={{ color: '#03c75a' }} />
      case 'daum':
        return <GlobalOutlined style={{ color: '#0066cc' }} />
      default:
        return <GlobalOutlined />
    }
  }

  const taskColumns = [
    {
      title: '시간',
      dataIndex: 'id',
      key: 'time',
      render: (id: string) => new Date(parseInt(id)).toLocaleString(),
    },
    {
      title: '사이트',
      dataIndex: 'siteUrl',
      key: 'siteUrl',
    },
    {
      title: 'URL 수',
      dataIndex: 'urls',
      key: 'urlCount',
      render: (urls: string[]) => urls.length,
    },
    {
      title: '서비스',
      dataIndex: 'services',
      key: 'services',
      render: (services: string[]) => (
        <Space>
          {services.map(service => (
            <Tag key={service} icon={getServiceIcon(service)}>
              {service.toUpperCase()}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          pending: 'default',
          running: 'processing',
          completed: 'success',
          failed: 'error',
        }
        return <Tag color={colors[status as keyof typeof colors]}>{status}</Tag>
      },
    },
  ]

  const siteConfig = getSelectedSiteConfig()

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>인덱싱 대시보드</Title>
      </div>

      {/* 사이트 선택 및 통계 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="등록된 사이트" value={sites.length} prefix={<GlobalOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="완료된 작업"
              value={indexingTasks.filter(t => t.status === 'completed').length}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="총 인덱싱 URL" value={siteConfig?.indexingUrls.length || 0} prefix={<ReloadOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 사이트 선택 및 빠른 작업 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>사이트 선택:</Text>
            <Select
              style={{ width: 300, marginLeft: 8 }}
              value={selectedSite}
              onChange={setSelectedSite}
              placeholder="사이트를 선택하세요"
            >
              {sites.map(site => (
                <Select.Option key={site.siteUrl} value={site.siteUrl}>
                  {site.siteUrl} ({site.blogType})
                </Select.Option>
              ))}
            </Select>
          </div>

          {siteConfig && (
            <div>
              <Text strong>활성화된 서비스: </Text>
              <Space>
                {siteConfig.bing?.use && <Tag color="orange">Bing</Tag>}
                {siteConfig.google?.use && <Tag color="blue">Google</Tag>}
                {siteConfig.naver?.use && <Tag color="green">Naver</Tag>}
                {siteConfig.daum?.use && <Tag color="purple">Daum</Tag>}
              </Space>
            </div>
          )}

          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleManualIndexing}
              disabled={!siteConfig || loading}
              loading={loading}
            >
              수동 인덱싱 실행
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadSites}>
              새로고침
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 작업 내역 */}
      <Card title="인덱싱 작업 내역">
        <Table
          columns={taskColumns}
          dataSource={indexingTasks}
          rowKey="id"
          locale={{ emptyText: '실행된 작업이 없습니다.' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 수동 인덱싱 모달 */}
      <Modal
        title="수동 인덱싱 실행"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={executeIndexing}>
          <Form.Item name="urls" label="인덱싱할 URL 목록" rules={[{ required: true, message: 'URL을 입력해주세요' }]}>
            <TextArea rows={8} placeholder="한 줄에 하나씩 URL을 입력해주세요" />
          </Form.Item>

          <Form.Item
            name="services"
            label="실행할 서비스"
            rules={[{ required: true, message: '최소 하나의 서비스를 선택해주세요' }]}
          >
            <Checkbox.Group>
              {siteConfig?.bing?.use && <Checkbox value="bing">{getServiceIcon('bing')} Bing</Checkbox>}
              {siteConfig?.google?.use && <Checkbox value="google">{getServiceIcon('google')} Google</Checkbox>}
              {siteConfig?.naver?.use && <Checkbox value="naver">{getServiceIcon('naver')} Naver</Checkbox>}
              {siteConfig?.daum?.use && <Checkbox value="daum">{getServiceIcon('daum')} Daum</Checkbox>}
            </Checkbox.Group>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                실행
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default IndexingDashboard

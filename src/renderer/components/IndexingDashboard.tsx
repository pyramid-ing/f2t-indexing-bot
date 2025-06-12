import React, { useState, useEffect, useMemo } from 'react'
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
  Divider,
  Alert,
  Checkbox,
} from 'antd'
import {
  PlayCircleOutlined,
  ReloadOutlined,
  GoogleOutlined,
  YahooOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  LoginOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  bingManualIndex,
  daumManualIndex,
  googleManualIndex,
  naverManualIndex,
  getAllSiteConfigs,
  getGlobalSettings,
  checkNaverLoginStatus,
  getErrorMessage,
  getErrorDetails,
  SiteConfig,
  checkNaverLoginComplete,
  openNaverLoginBrowser,
  closeNaverLoginBrowser,
  NaverLoginStatus,
} from '../api'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface IndexingTask {
  id: string
  siteUrl: string
  urls: string[]
  services: ('bing' | 'google' | 'naver' | 'daum')[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: Record<
    string,
    {
      status: 'success' | 'failed' | 'running'
      data?: any
      error?: string
      errorDetails?: string
      errorCode?: string
      errorService?: string
      progress?: number
    }
  >
  startTime: number
  endTime?: number
  _groupedUrls?: Record<string, string[]>
}

interface DetailedResult {
  id: string
  service: string
  url: string
  status: 'success' | 'failed' | 'running'
  message: string
  rawData: any
}

const IndexingDashboard: React.FC = () => {
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [urls, setUrls] = useState<string>('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [indexingTasks, setIndexingTasks] = useState<IndexingTask[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<IndexingTask | null>(null)
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [naverLoginStatus, setNaverLoginStatus] = useState<NaverLoginStatus | null>(null)
  const [naverLoginChecking, setNaverLoginChecking] = useState(false)
  const [naverLoginBrowserOpen, setNaverLoginBrowserOpen] = useState(false)
  const [form] = Form.useForm()

  // --- New states for detailed view ---
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<{ status: string; services: string[] }>({
    status: 'all',
    services: [],
  })

  useEffect(() => {
    loadSites()
    loadGlobalSettings()
    checkNaverLogin()
  }, [])

  useEffect(() => {
    // 네이버가 활성화되어 있으면 로그인 상태 확인
    if (globalSettings?.naver?.use) {
      checkNaverLogin()
    }
  }, [globalSettings])

  const loadSites = async () => {
    try {
      const response = await getAllSiteConfigs()
      const data = response.data || []
      setSites(data)
      if (data.length > 0) {
        setSelectedSite(data[0].siteUrl)
      }
    } catch (error) {
      message.error('사이트 목록을 불러오는 데 실패했습니다.')
    }
  }

  const loadGlobalSettings = async () => {
    try {
      const response = await getGlobalSettings()
      if (response.success && response.data) {
        setGlobalSettings(response.data)
        form.setFieldsValue({ services: getAvailableServices(response.data) })
      }
    } catch (error) {
      console.error('전역 설정 로드 실패:', error)
      message.error('전역 설정을 불러오는데 실패했습니다.')
    }
  }

  const getSelectedSiteConfig = () => sites.find(site => site.siteUrl === selectedSite)

  const getAvailableServices = (settings = globalSettings) => {
    if (!settings) return []
    const services = []
    if (settings.google?.use) services.push('google')
    if (settings.bing?.use) services.push('bing')
    if (settings.naver?.use) services.push('naver')
    if (settings.daum?.use) services.push('daum')
    return services
  }

  const handleManualIndexing = (taskValues: Partial<IndexingTask>) => {
    const siteConfig = getSelectedSiteConfig()
    if (!siteConfig) {
      message.error('사이트를 선택해주세요.')
      return
    }
    executeIndexing({ siteUrl: siteConfig.siteUrl, ...taskValues })
  }

  const executeIndexing = async (values: any) => {
    setLoading(true)
    const { siteUrl, urls, services, _groupedUrls } = values
    const taskId = `task-${Date.now()}`
    const newTask: IndexingTask = {
      id: taskId,
      siteUrl,
      urls,
      services,
      status: 'running',
      results: {},
      startTime: Date.now(),
    }
    setIndexingTasks(prev => [newTask, ...prev])
    if (!_groupedUrls) form.resetFields(['urls']) // Reset form only for new tasks

    try {
      for (const service of services) {
        const urlsForService = _groupedUrls ? _groupedUrls[service] : urls
        if (!urlsForService || urlsForService.length === 0) continue

        setIndexingTasks(prev => prev.map(t => t.id === taskId ? { ...t, results: { ...t.results, [service]: { status: 'running' } } } : t))

        try {
          let result
          switch (service) {
            case 'bing':
              result = await bingManualIndex({ siteUrl, urls: urlsForService })
              break
            case 'google':
              result = await googleManualIndex({ siteUrl, urls: urlsForService, type: 'URL_UPDATED' })
              break
            case 'naver':
              if (!naverLoginStatus?.isLoggedIn) throw new Error('네이버 로그인이 필요합니다.')
              result = await naverManualIndex({ siteUrl, urlsToIndex: urlsForService })
              break
            case 'daum':
              result = await daumManualIndex({ siteUrl, urlsToIndex: urlsForService })
              break
          }
          setIndexingTasks(prev => prev.map(t => t.id === taskId ? { ...t, results: { ...t.results, [service]: { status: 'success', data: result } } } : t))
        } catch (error) {
          setIndexingTasks(prev => prev.map(t => t.id === taskId ? { ...t, results: { ...t.results, [service]: { status: 'failed', error: getErrorMessage(error), errorDetails: getErrorDetails(error), data: error.response?.data } } } : t))
        }
      }

      const finalTask = indexingTasks.find(t => t.id === taskId)
      const hasAnyFailure = finalTask?.results && Object.values(finalTask.results).some(r => r.status === 'failed')

      setIndexingTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, status: hasAnyFailure ? 'failed' : 'completed', endTime: Date.now() } : t,
        ),
      )
      if (hasAnyFailure) {
        message.warning('일부 서비스에서 인덱싱에 실패했습니다.')
      } else {
        message.success('모든 서비스에서 인덱싱이 성공적으로 완료되었습니다.')
      }
    } catch (error) {
      setIndexingTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'failed', endTime: Date.now() } : t)))
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
        return <GlobalOutlined style={{ color: '#0f6ecd' }} />
      default:
        return null
    }
  }

  const getServiceStatusIcon = (service: string, results?: IndexingTask['results']) => {
    if (!results || !results[service]) {
      return <span style={{ color: '#d9d9d9' }}>-</span>
    }

    const result = results[service]
    switch (result.status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <span style={{ color: '#d9d9d9' }}>-</span>
    }
  }

  const showTaskDetail = (task: IndexingTask) => {
    const flattened = flattenResults(task)
    setDetailedResults(flattened)
    setSelectedTask(task)
    setIsModalVisible(true)
    // Reset filters and selection when opening modal
    setFilters({ status: 'all', services: [] })
    setSelectedRowKeys([])
  }

  const getExecutionTime = (task: IndexingTask) => {
    if (!task.endTime) return '-'
    const duration = task.endTime - task.startTime
    return `${(duration / 1000).toFixed(2)}초`
  }

  const flattenResults = (task: IndexingTask): DetailedResult[] => {
    if (!task.results) return []
    const flatList: DetailedResult[] = []

    task.services.forEach((service, serviceIndex) => {
      const result = task.results?.[service]
      if (!result) return

      const processIndividualResults = (resultsArray: any[]) => {
        resultsArray.forEach((res, resIndex) => {
          const isSuccess = res.success === true || res.status === 'success'
          flatList.push({
            id: `${service}-${res.url}-${serviceIndex}-${resIndex}`,
            service,
            url: res.url,
            status: isSuccess ? 'success' : 'failed',
            message: isSuccess ? res.msg || '성공' : res.error?.message || res.msg || '실패',
            rawData: res,
          })
        })
      }

      if (result.status === 'failed') {
        const detailedResults = result.data?.details?.results || (Array.isArray(result.data) ? result.data : null)
        if (detailedResults) processIndividualResults(detailedResults)
        else task.urls.forEach((url, urlIndex) => flatList.push({
          id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
          service,
          url,
          status: 'failed',
          message: result.error || '요청 실패',
          rawData: result,
        }))
      } else if (result.status === 'success' && result.data) {
        if (Array.isArray(result.data.results)) processIndividualResults(result.data.results)
        else if (Array.isArray(result.data)) processIndividualResults(result.data)
      } else if (result.status === 'running') {
        task.urls.forEach((url, urlIndex) => flatList.push({
          id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
          service,
          url,
          status: 'running',
          message: '진행 중...',
          rawData: result,
        }))
      }
    })
    return flatList
  }

  const handleReRequest = (isSingle: boolean, record?: DetailedResult) => {
    const itemsToReRequest = isSingle && record ? [record] : detailedResults.filter(r => selectedRowKeys.includes(r.id))
    if (itemsToReRequest.length === 0) return message.warning('재요청할 항목을 선택해주세요.')

    const groupedByService = itemsToReRequest.reduce((acc, item) => {
      if (!acc[item.service]) acc[item.service] = []
      acc[item.service].push(item.url)
      return acc
    }, {} as Record<string, string[]>)

    handleManualIndexing({ urls: [], services: Object.keys(groupedByService) as any, _groupedUrls: groupedByService })
    message.success(`${itemsToReRequest.length}개 항목 재요청 시작.`)
    if (!isSingle) setSelectedRowKeys([])
  }

  const filteredDetailedResults = useMemo(() => {
    return detailedResults.filter(item => {
      const statusMatch = filters.status === 'all' || item.status === filters.status
      const serviceMatch = filters.services.length === 0 || filters.services.includes(item.service)
      return statusMatch && serviceMatch
    })
  }, [detailedResults, filters])

  const taskColumns = [
    { title: '실행 시간', dataIndex: 'startTime', key: 'startTime', render: (st: number) => new Date(st).toLocaleString() },
    { title: '사이트', dataIndex: 'siteUrl', key: 'siteUrl' },
    { title: 'URL 수', dataIndex: 'urls', key: 'urlCount', render: (urls: string[]) => `${urls.length}개` },
    { title: '상태', dataIndex: 'status', key: 'status',
      render: (status: string) => {
        const tagMap: { [key: string]: JSX.Element } = {
          running: <Tag color="processing">실행중</Tag>,
          completed: <Tag color="success">완료</Tag>,
          failed: <Tag color="error">실패</Tag>,
          pending: <Tag>대기중</Tag>,
        }
        return tagMap[status] || <Tag>알 수 없음</Tag>
      },
    },
    { title: '소요 시간', key: 'duration', render: (_: any, record: IndexingTask) => getExecutionTime(record) },
    { title: '작업', key: 'action', render: (_: any, record: IndexingTask) => <Button onClick={() => showTaskDetail(record)} icon={<EyeOutlined />}>상세 보기</Button> },
  ]

  const detailedResultColumns = [
    { title: '엔진', dataIndex: 'service', key: 'service', width: 120, render: (service: string) => <Space>{getServiceIcon(service)} {service.charAt(0).toUpperCase() + service.slice(1)}</Space> },
    { title: 'URL', dataIndex: 'url', key: 'url', render: (url: string) => <Text style={{ maxWidth: 400 }} ellipsis={{ tooltip: url }} copyable>{url}</Text> },
    { title: '상태', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => status === 'success' ? <Tag color="success">성공</Tag> : status === 'failed' ? <Tag color="error">실패</Tag> : <Tag color="processing">진행중</Tag>,
    },
    { title: '결과 메시지', dataIndex: 'message', key: 'message', render: (msg: string) => <Text style={{ maxWidth: 300 }} ellipsis={{ tooltip: msg }}>{msg}</Text> },
    { title: '작업', key: 'action', width: 100, render: (_: any, record: DetailedResult) => record.status === 'failed' ? <Button size="small" onClick={() => handleReRequest(true, record)}>재시도</Button> : null },
  ]

  const checkNaverLogin = async () => {
    if (!globalSettings?.naver?.use) return

    setNaverLoginChecking(true)
    try {
      const status = await checkNaverLoginStatus()
      setNaverLoginStatus(status)
    } catch (error) {
      console.error('네이버 로그인 상태 확인 실패:', error)
      setNaverLoginStatus({
        isLoggedIn: false,
        needsLogin: true,
        message: '로그인 상태 확인 실패',
      })
    } finally {
      setNaverLoginChecking(false)
    }
  }

  const handleNaverLogin = async () => {
    try {
      const result = await openNaverLoginBrowser()
      if (result.success) {
        setNaverLoginBrowserOpen(true)
        message.info('네이버 로그인 창이 열렸습니다. 수동으로 로그인해주세요.')

        // 5초마다 로그인 완료 상태 확인
        const checkInterval = setInterval(async () => {
          try {
            const completeResult = await checkNaverLoginComplete()
            if (completeResult.success) {
              clearInterval(checkInterval)
              setNaverLoginBrowserOpen(false)
              message.success('네이버 로그인이 완료되었습니다!')
              await checkNaverLogin() // 상태 새로고침
            }
          } catch (error) {
            // 브라우저가 닫혔거나 오류 발생 시 체크 중단
            console.log('로그인 완료 확인 중 오류:', error)
          }
        }, 5000)

        // 2분 후 자동으로 체크 중단
        setTimeout(() => {
          clearInterval(checkInterval)
          if (naverLoginBrowserOpen) {
            setNaverLoginBrowserOpen(false)
            message.warning('로그인 확인을 중단했습니다. 로그인 완료 후 상태를 새로고침해주세요.')
          }
        }, 120000)
      } else {
        message.error(result.message)
      }
    } catch (error) {
      console.error('네이버 로그인 브라우저 열기 실패:', error)
      message.error('네이버 로그인 창 열기에 실패했습니다.')
    }
  }

  const handleCloseNaverBrowser = async () => {
    try {
      await closeNaverLoginBrowser()
      setNaverLoginBrowserOpen(false)
      message.info('네이버 로그인 브라우저를 닫았습니다.')
    } catch (error) {
      console.error('브라우저 닫기 실패:', error)
      message.error('브라우저 닫기에 실패했습니다.')
    }
  }

  const availableServices = getAvailableServices()

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={16}>
        <Col span={24}>
          <Card title={<Title level={4}>새 인덱싱 작업</Title>}>
            <div style={{marginBottom: '16px'}}>
              <Text strong>사이트 선택: </Text>
              <Select
                style={{ width: 300, marginLeft: 8 }}
                value={selectedSite}
                onChange={setSelectedSite}
                placeholder="사이트를 선택하세요"
              >
                {sites.map(site => (
                  <Select.Option key={site.siteUrl} value={site.siteUrl}>
                    {site.name} ({site.siteUrl})
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Form
              form={form}
              layout="vertical"
              onFinish={values => handleManualIndexing({
                urls: values.urls.split('\n').filter((u: string) => u.trim() !== ''),
                services: values.services,
              })}
            >
              <Form.Item name="urls" label="URL 목록" rules={[{ required: true, message: 'URL을 입력해주세요' }]}>
                <TextArea rows={6} placeholder="한 줄에 하나씩 URL을 입력해주세요." />
              </Form.Item>
              <Form.Item name="services" label="검색 엔진" rules={[{ required: true, message: '하나 이상의 엔진을 선택해주세요' }]}>
                <Checkbox.Group>
                  <Space wrap>
                    {getAvailableServices(globalSettings).map(service => (
                      <Checkbox key={service} value={service} disabled={service === 'naver' && !naverLoginStatus?.isLoggedIn}>
                        <Space>{getServiceIcon(service)} {service.charAt(0).toUpperCase() + service.slice(1)}</Space>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
              {naverLoginStatus && !naverLoginStatus.isLoggedIn && globalSettings?.naver.use &&
                <Alert message="네이버 서비스는 로그인이 필요합니다." type="warning" showIcon style={{marginBottom: 16}}/>}
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<PlayCircleOutlined />} disabled={loading || availableServices.length === 0}>
                  인덱싱 시작
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
      <Card title={<Title level={4}>인덱싱 작업 내역</Title>} style={{ marginTop: 16 }}>
        <Table columns={taskColumns} dataSource={indexingTasks} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
      </Card>
      <Modal
        title="인덱싱 작업 상세 결과"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[<Button key="close" onClick={() => setIsModalVisible(false)}>닫기</Button>]}
        width="90vw"
        style={{ top: 20 }}
      >
        {selectedTask && (
          <div>
            <p><strong>사이트:</strong> {selectedTask.siteUrl}</p>
            <p><strong>실행 시간:</strong> {new Date(selectedTask.startTime).toLocaleString()}</p>
            <p><strong>총 소요 시간:</strong> {getExecutionTime(selectedTask)}</p>
            <Divider />
            <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Select value={filters.status} onChange={value => setFilters(f => ({ ...f, status: value }))} style={{ width: 120 }}>
                  <Option value="all">전체 상태</Option>
                  <Option value="success">성공</Option>
                  <Option value="failed">실패</Option>
                </Select>
                <Select mode="multiple" placeholder="서비스 필터" value={filters.services} onChange={value => setFilters(f => ({ ...f, services: value }))} style={{ minWidth: 200 }} allowClear>
                  {selectedTask.services.map(s => <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>)}
                </Select>
              </Space>
              <Button type="primary" onClick={() => handleReRequest(false)} disabled={selectedRowKeys.length === 0}>
                선택 항목 재요청 ({selectedRowKeys.length})
              </Button>
            </Space>
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (record: DetailedResult) => ({ disabled: record.status !== 'failed' }),
              }}
              columns={detailedResultColumns}
              dataSource={filteredDetailedResults}
              rowKey="id"
              size="small"
              bordered
              pagination={{ pageSize: 100, hideOnSinglePage: true }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default IndexingDashboard

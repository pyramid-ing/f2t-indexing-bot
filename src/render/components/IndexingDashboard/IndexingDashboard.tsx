import type {
  NaverLoginStatus,
  SiteConfig,
} from '../../api'
import type { DetailedResult } from './IndexingDetailModal'
import type { IndexingTask } from './useIndexingTasks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
  GoogleOutlined,
  LoadingOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  YahooOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Col, Form, Input, message, Row, Select, Space, Tag, Typography } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import {
  bingManualIndex,
  checkExistingUrls,
  checkNaverLoginComplete,
  checkNaverLoginStatus,
  closeNaverLoginBrowser,
  daumManualIndex,
  getAllSiteConfigs,
  getErrorDetails,
  getErrorMessage,
  getGlobalSettings,
  googleManualIndex,
  naverManualIndex,
  openNaverLoginBrowser,
} from '../../api'
import IndexingDetailModal from './IndexingDetailModal'
import IndexingTaskTable from './IndexingTaskTable'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface Props {
  indexingTasks: IndexingTask[]
  setIndexingTasks: React.Dispatch<React.SetStateAction<IndexingTask[]>>
  addTask: (task: IndexingTask) => void
  updateTask: (id: string, updater: (task: IndexingTask) => IndexingTask) => void
}

const IndexingDashboard: React.FC<Props> = ({ indexingTasks, setIndexingTasks, addTask, updateTask }) => {
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<IndexingTask | null>(null)
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [naverLoginStatus, setNaverLoginStatus] = useState<NaverLoginStatus | null>(null)
  const [naverLoginChecking, setNaverLoginChecking] = useState(false)
  const [naverLoginBrowserOpen, setNaverLoginBrowserOpen] = useState(false)
  const [form] = Form.useForm()
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<{ status: string, services: string[] }>({ status: 'all', services: [] })

  useEffect(() => {
    loadSites()
    loadGlobalSettings()
    checkNaverLogin()
  }, [])

  useEffect(() => {
    if (globalSettings?.naver?.use) {
      checkNaverLogin()
    }
  }, [globalSettings])

  useEffect(() => {
    if (naverLoginStatus && !naverLoginStatus.isLoggedIn) {
      const currentServices = form.getFieldValue('services') as string[]
      if (currentServices?.includes('naver')) {
        form.setFieldsValue({ services: currentServices.filter(s => s !== 'naver') })
      }
    }
  }, [naverLoginStatus, form])

  const loadSites = async () => {
    try {
      const response = await getAllSiteConfigs()
      const data = response.data || []
      setSites(data)
      if (data.length > 0) {
        setSelectedSite(data[0].siteUrl)
      }
    }
    catch (error) {
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
    }
    catch (error) {
      console.error('전역 설정 로드 실패:', error)
      message.error('전역 설정을 불러오는데 실패했습니다.')
    }
  }

  const getSelectedSiteConfig = () => sites.find(site => site.siteUrl === selectedSite)

  const getAvailableServices = (settings = globalSettings) => {
    if (!settings)
      return []
    const services = []
    if (settings.google?.use)
      services.push('google')
    if (settings.bing?.use)
      services.push('bing')
    if (settings.naver?.use)
      services.push('naver')
    if (settings.daum?.use)
      services.push('daum')
    return services
  }

  const handleManualIndexing = (taskValues: Partial<IndexingTask>) => {
    const siteConfig = getSelectedSiteConfig()
    if (!siteConfig) {
      message.error('사이트를 선택해주세요.')
      return
    }

    ;(async () => {
      setLoading(true)
      try {
        const urlList = Array.isArray(taskValues.urls)
          ? taskValues.urls
          : (taskValues.urls as string).split('\\n').filter(u => u.trim() !== '')

        if (urlList.length === 0) {
          message.error('URL을 입력해주세요.')
          setLoading(false)
          return
        }

        const services = (taskValues.services || []) as any[]
        const existingUrlsByProvider = await checkExistingUrls(urlList, services)
        const groupedUrlsToSubmit = services.reduce(
          (acc, service) => {
            const existingForService = existingUrlsByProvider[service.toUpperCase()] || []
            const urlsToSubmit = urlList.filter(url => !existingForService.includes(url))
            if (urlsToSubmit.length > 0)
              acc[service] = urlsToSubmit
            return acc
          },
          {} as Record<string, string[]>,
        )

        const totalToSubmit = Object.values(groupedUrlsToSubmit).flat().length
        const totalSkipped = urlList.length - totalToSubmit

        if (totalSkipped > 0) {
          message.info(`이미 성공한 ${totalSkipped}개의 URL을 제외하고 인덱싱을 시작합니다.`)
        }

        if (totalToSubmit === 0) {
          message.success('모든 URL이 이미 성공적으로 색인되었습니다. 새로 제출할 URL이 없습니다.')
          setLoading(false)
          return
        }

        const servicesWithUrls = Object.keys(groupedUrlsToSubmit)
        await executeIndexing({
          siteUrl: siteConfig.siteUrl,
          urls: urlList,
          services: servicesWithUrls,
          _groupedUrls: groupedUrlsToSubmit,
        })
      }
      catch (error) {
        console.error('인덱싱 준비 중 오류:', error)
        message.error(`인덱싱 준비 중 오류가 발생했습니다: ${getErrorMessage(error)}`)
        setLoading(false)
      }
    })()
  }

  const executeIndexing = async (values: any) => {
    setLoading(true)
    const { siteUrl, urls, services, _groupedUrls } = values
    const taskId = `task-${Date.now()}`
    addTask({
      id: taskId,
      siteUrl,
      urls,
      services,
      status: 'running',
      results: {},
      startTime: Date.now(),
      _groupedUrls,
    })
    if (!_groupedUrls)
      form.resetFields(['urls'])

    try {
      for (const service of services) {
        const urlsForService = _groupedUrls ? _groupedUrls[service] : urls
        if (!urlsForService || urlsForService.length === 0)
          continue

        updateTask(taskId, t => ({ ...t, results: { ...t.results, [service]: { status: 'running' } } }))

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
              if (!naverLoginStatus?.isLoggedIn)
                throw new Error('네이버 로그인이 필요합니다.')
              result = await naverManualIndex({ siteUrl, urlsToIndex: urlsForService })
              break
            case 'daum':
              result = await daumManualIndex({ siteUrl, urlsToIndex: urlsForService })
              break
          }
          updateTask(taskId, t => ({ ...t, results: { ...t.results, [service]: { status: 'success', data: result } } }))
        }
        catch (error) {
          updateTask(taskId, t => ({
            ...t,
            results: {
              ...t.results,
              [service]: {
                status: 'failed',
                error: getErrorMessage(error),
                errorDetails: getErrorDetails(error),
                data: error.response?.data,
              },
            },
          }))
        }
      }

      const finalTask = indexingTasks.find(t => t.id === taskId)
      const hasAnyFailure = finalTask?.results && Object.values(finalTask.results).some(r => r.status === 'failed')

      updateTask(taskId, t => ({ ...t, status: hasAnyFailure ? 'failed' : 'completed', endTime: Date.now() }))

      if (hasAnyFailure) {
        message.warning('일부 서비스에서 인덱싱에 실패했습니다.')
      }
      else {
        message.success('모든 서비스에서 인덱싱이 성공적으로 완료되었습니다.')
      }
    }
    catch (error) {
      updateTask(taskId, t => ({ ...t, status: 'failed', endTime: Date.now() }))
      message.error('인덱싱 작업 중 오류가 발생했습니다.')
    }
    finally {
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

  const showTaskDetail = (task: IndexingTask) => {
    const flattened = flattenResults(task)
    setDetailedResults(flattened)
    setSelectedTask(task)
    setIsModalVisible(true)
    setFilters({ status: 'all', services: [] })
    setSelectedRowKeys([])
  }

  const getExecutionTime = (task: IndexingTask) => {
    if (!task.endTime)
      return '-'
    const duration = task.endTime - task.startTime
    return `${(duration / 1000).toFixed(2)}초`
  }

  const flattenResults = (task: IndexingTask): DetailedResult[] => {
    if (!task.results)
      return []
    const flatList: DetailedResult[] = []

    task.services.forEach((service, serviceIndex) => {
      const result = task.results?.[service]
      if (!result)
        return

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
        if (detailedResults) {
          processIndividualResults(detailedResults)
        }
        else {
          task.urls.forEach((url, urlIndex) =>
            flatList.push({
              id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
              service,
              url,
              status: 'failed',
              message: result.error || '요청 실패',
              rawData: result,
            }),
          )
        }
      }
      else if (result.status === 'success' && result.data) {
        if (service === 'bing' && result.data.success) {
          const urlsForService = task._groupedUrls?.[service] || task.urls
          urlsForService.forEach((url, urlIndex) => {
            flatList.push({
              id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
              service,
              url,
              status: 'success',
              message: result.data.message || '요청 성공',
              rawData: result.data,
            })
          })
        }
        else if (Array.isArray(result.data.results)) {
          processIndividualResults(result.data.results)
        }
        else if (Array.isArray(result.data)) {
          processIndividualResults(result.data)
        }
      }
      else if (result.status === 'running') {
        task.urls.forEach((url, urlIndex) =>
          flatList.push({
            id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
            service,
            url,
            status: 'running',
            message: '진행 중...',
            rawData: result,
          }),
        )
      }
    })
    return flatList
  }

  const handleReRequest = (isSingle: boolean, record?: DetailedResult) => {
    const itemsToReRequest = isSingle && record ? [record] : detailedResults.filter(r => selectedRowKeys.includes(r.id))
    if (itemsToReRequest.length === 0)
      return message.warning('재요청할 항목을 선택해주세요.')

    const groupedByService = itemsToReRequest.reduce(
      (acc, item) => {
        if (!acc[item.service])
          acc[item.service] = []
        acc[item.service].push(item.url)
        return acc
      },
      {} as Record<string, string[]>,
    )
    const allUrlsToReRequest = Array.from(new Set(itemsToReRequest.map(item => item.url)))
    handleManualIndexing({
      urls: allUrlsToReRequest,
      services: Object.keys(groupedByService) as any,
      _groupedUrls: groupedByService,
    })
    message.success(`${itemsToReRequest.length}개 항목 재요청 시작.`)
    if (!isSingle)
      setSelectedRowKeys([])
  }

  const filteredDetailedResults = useMemo(() => {
    return detailedResults.filter((item) => {
      const statusMatch = filters.status === 'all' || item.status === filters.status
      const serviceMatch = filters.services.length === 0 || filters.services.includes(item.service)
      return statusMatch && serviceMatch
    })
  }, [detailedResults, filters])

  const checkNaverLogin = async () => {
    if (!globalSettings?.naver?.use)
      return
    setNaverLoginChecking(true)
    try {
      const status = await checkNaverLoginStatus()
      setNaverLoginStatus(status)
    }
    catch (error) {
      console.error('네이버 로그인 상태 확인 실패:', error)
      setNaverLoginStatus({ isLoggedIn: false, needsLogin: true, message: '로그인 상태 확인 실패' })
    }
    finally {
      setNaverLoginChecking(false)
    }
  }

  const handleNaverLogin = async () => {
    try {
      const result = await openNaverLoginBrowser()
      if (result.success) {
        setNaverLoginBrowserOpen(true)
        message.info('네이버 로그인 창이 열렸습니다. 수동으로 로그인해주세요.')
        const checkInterval = setInterval(async () => {
          try {
            const completeResult = await checkNaverLoginComplete()
            if (completeResult.success) {
              clearInterval(checkInterval)
              setNaverLoginBrowserOpen(false)
              message.success('네이버 로그인이 완료되었습니다!')
              await checkNaverLogin()
            }
          }
          catch (error) {
            console.log('로그인 완료 확인 중 오류:', error)
          }
        }, 5000)
        setTimeout(() => {
          clearInterval(checkInterval)
          if (naverLoginBrowserOpen) {
            setNaverLoginBrowserOpen(false)
            message.warning('로그인 확인을 중단했습니다. 로그인 완료 후 상태를 새로고침해주세요.')
          }
        }, 120000)
      }
      else {
        message.error(result.message)
      }
    }
    catch (error) {
      console.error('네이버 로그인 브라우저 열기 실패:', error)
      message.error('네이버 로그인 창 열기에 실패했습니다.')
    }
  }

  const handleCloseNaverBrowser = async () => {
    try {
      await closeNaverLoginBrowser()
      setNaverLoginBrowserOpen(false)
      message.info('네이버 로그인 브라우저를 닫았습니다.')
    }
    catch (error) {
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
            <div style={{ marginBottom: '16px' }}>
              <Text strong>사이트 선택: </Text>
              <Select
                style={{ width: 300, marginLeft: 8 }}
                value={selectedSite}
                onChange={setSelectedSite}
                placeholder="사이트를 선택하세요"
              >
                {sites.map(site => (
                  <Select.Option key={site.siteUrl} value={site.siteUrl}>
                    {site.name}
                    {' '}
                    (
                    {site.siteUrl}
                    )
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Form
              form={form}
              layout="vertical"
              onFinish={values =>
                handleManualIndexing({
                  urls: values.urls.split('\\n').filter((u: string) => u.trim() !== ''),
                  services: values.services,
                })}
            >
              <Form.Item name="urls" label="URL 목록" rules={[{ required: true, message: 'URL을 입력해주세요' }]}>
                <TextArea rows={6} placeholder="한 줄에 하나씩 URL을 입력해주세요." />
              </Form.Item>
              <Form.Item
                name="services"
                label="검색 엔진"
                rules={[{ required: true, message: '하나 이상의 엔진을 선택해주세요' }]}
              >
                <Checkbox.Group>
                  <Space wrap>
                    {getAvailableServices(globalSettings).map(service => (
                      <Checkbox
                        key={service}
                        value={service}
                        disabled={service === 'naver' && !naverLoginStatus?.isLoggedIn}
                      >
                        <Space>
                          {getServiceIcon(service)}
                          {' '}
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                        </Space>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
              {globalSettings?.naver?.use && (
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <Space align="center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      <Text strong>네이버 로그인 상태:</Text>
                      {naverLoginChecking
                        ? (
                            <Tag icon={<LoadingOutlined />} color="blue">
                              확인 중...
                            </Tag>
                          )
                        : naverLoginStatus?.isLoggedIn
                          ? (
                              <Tag icon={<CheckCircleOutlined />} color="success">
                                로그인됨
                              </Tag>
                            )
                          : (
                              <Tag icon={<CloseCircleOutlined />} color="error">
                                로그인 필요
                              </Tag>
                            )}
                    </Space>
                    <Space>
                      {naverLoginBrowserOpen
                        ? (
                            <>
                              <Button size="small" icon={<LoadingOutlined />} onClick={checkNaverLogin}>
                                완료 확인
                              </Button>
                              <Button size="small" danger onClick={handleCloseNaverBrowser}>
                                창 닫기
                              </Button>
                            </>
                          )
                        : naverLoginStatus && !naverLoginStatus.isLoggedIn
                          ? (
                              <Button size="small" icon={<LoginOutlined />} onClick={handleNaverLogin}>
                                로그인하기
                              </Button>
                            )
                          : (
                              <Button size="small" icon={<ReloadOutlined />} onClick={checkNaverLogin}>
                                새로고침
                              </Button>
                            )}
                    </Space>
                  </Space>
                  {naverLoginStatus && !naverLoginStatus.isLoggedIn && (
                    <Alert
                      message={naverLoginStatus.message || '네이버 서비스 이용을 위해 로그인이 필요합니다.'}
                      type="warning"
                      showIcon
                      style={{ marginTop: 12 }}
                    />
                  )}
                </div>
              )}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<PlayCircleOutlined />}
                  disabled={loading || availableServices.length === 0}
                >
                  인덱싱 시작
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
      <Card title={<Title level={4}>인덱싱 작업 내역</Title>} style={{ marginTop: 16 }}>
        <IndexingTaskTable tasks={indexingTasks} loading={loading} onShowDetail={showTaskDetail} />
      </Card>
      <IndexingDetailModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        selectedTask={selectedTask}
        detailedResults={detailedResults}
        filters={filters}
        setFilters={setFilters}
        selectedRowKeys={selectedRowKeys}
        setSelectedRowKeys={setSelectedRowKeys}
        handleReRequest={handleReRequest}
        filteredDetailedResults={filteredDetailedResults}
        getExecutionTime={getExecutionTime}
      />
    </div>
  )
}

export default IndexingDashboard

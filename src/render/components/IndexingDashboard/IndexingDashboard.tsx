import type {
  NaverAccount,
  NaverLoginStatus,
  SiteConfig,
} from '../../api'
import type { DetailedResult } from './IndexingDetailModal'
import type { IndexingTask } from './useIndexingTasks'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  GoogleOutlined,
  LoadingOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  YahooOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Checkbox, Col, Form, Input, message, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import {
  bingManualIndex,
  checkExistingUrls,
  checkNaverLoginComplete,
  checkNaverLoginStatus,
  closeNaverLoginBrowser,
  createNaverAccount,
  daumManualIndex,
  deleteNaverAccount,
  findSiteConfigByUrl,
  getAllNaverAccounts,
  getAllSiteConfigs,
  getErrorDetails,
  getErrorMessage,
  getGlobalSettings,
  googleManualIndex,
  naverManualIndex,
  openNaverLoginBrowser,
  updateNaverAccount,
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
  const [selectedSite, setSelectedSite] = useState<SiteConfig | null>(null)
  const [urlsInput, setUrlsInput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<IndexingTask | null>(null)
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [naverLoginStatus, setNaverLoginStatus] = useState<NaverLoginStatus | null>(null)
  const [naverLoginChecking, setNaverLoginChecking] = useState(false)
  const [naverLoginBrowserOpen, setNaverLoginBrowserOpen] = useState(false)
  const [naverAccounts, setNaverAccounts] = useState<NaverAccount[]>([])
  const [isNaverAccountModalVisible, setIsNaverAccountModalVisible] = useState(false)
  const [isAddingNaverAccount, setIsAddingNaverAccount] = useState(false)
  const [form] = Form.useForm()
  const [naverAccountForm] = Form.useForm()
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<{ status: string, services: string[] }>({ status: 'all', services: [] })

  useEffect(() => {
    loadSites()
    loadGlobalSettings()
    loadNaverAccounts()
    checkNaverLogin()
  }, [])

  useEffect(() => {
    if (globalSettings?.naver?.use) {
      checkNaverLogin()
    }
  }, [globalSettings])

  // 네이버 로그인 상태가 변경되어도 폼은 자동으로 업데이트하지 않음
  // 대신 실행 시에 동적으로 처리

  // URL 입력 시 자동으로 사이트 매칭
  useEffect(() => {
    const detectSiteFromUrls = async () => {
      if (!urlsInput.trim()) {
        setSelectedSite(null)
        return
      }

      const urls = urlsInput.split('\n').filter(url => url.trim() !== '')
      if (urls.length === 0) {
        setSelectedSite(null)
        return
      }

      // 첫 번째 URL로 사이트 설정 찾기
      const firstUrl = urls[0].trim()

      try {
        const siteConfig = await findSiteConfigByUrl(firstUrl)

        if (siteConfig) {
          setSelectedSite(siteConfig)
        }
        else {
          setSelectedSite(null)
        }
      }
      catch (error) {
        setSelectedSite(null)
      }
    }

    const timeoutId = setTimeout(detectSiteFromUrls, 500) // 500ms 디바운스
    return () => clearTimeout(timeoutId)
  }, [urlsInput])

  const loadSites = async () => {
    try {
      const response = await getAllSiteConfigs()
      const data = response.data || []
      setSites(data)
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
        // 검색엔진 선택을 빈 배열로 초기화 (모든 활성화된 엔진 사용)
        form.setFieldsValue({ services: [] })
      }
    }
    catch (error) {
      console.error('전역 설정 로드 실패:', error)
      message.error('전역 설정을 불러오는데 실패했습니다.')
    }
  }

  const loadNaverAccounts = async () => {
    try {
      const accounts = await getAllNaverAccounts()
      setNaverAccounts(accounts)
    }
    catch (error) {
      console.error('네이버 계정 목록 로드 실패:', error)
    }
  }

  const getAvailableServices = (settings = globalSettings, site = selectedSite) => {
    // 선택된 사이트가 있으면 사이트별 설정 우선 사용
    if (site) {
      const services = []
      if (site.googleConfig?.use) {
        services.push('google')
      }
      if (site.bingConfig?.use) {
        services.push('bing')
      }
      if (site.naverConfig?.use) {
        services.push('naver')
      }
      if (site.daumConfig?.use) {
        services.push('daum')
      }
      return services
    }

    // 전역 설정 사용
    if (!settings) {
      return []
    }
    const services = []
    if (settings.google?.use) {
      services.push('google')
    }
    if (settings.bing?.use) {
      services.push('bing')
    }
    if (settings.naver?.use) {
      services.push('naver')
    }
    if (settings.daum?.use) {
      services.push('daum')
    }
    return services
  }

  const handleManualIndexing = async (taskValues: Partial<IndexingTask>) => {
    const urls = Array.isArray(taskValues.urls)
      ? taskValues.urls
      : (taskValues.urls as string).split('\n').filter(u => u.trim() !== '')

    if (urls.length === 0) {
      message.error('URL을 입력해주세요.')
      return
    }

    // 사이트가 감지되지 않았다면 실시간으로 다시 시도
    let currentSite = selectedSite
    if (!currentSite) {
      try {
        const firstUrl = urls[0].trim()
        const siteConfig = await findSiteConfigByUrl(firstUrl)
        if (siteConfig) {
          currentSite = siteConfig
          setSelectedSite(siteConfig)
        }
      }
      catch (error) {
        // 사이트 감지 실패 시 무시하고 진행
      }
    }

    // 여전히 사이트를 찾지 못했다면 에러 표시
    if (!currentSite) {
      try {
        const firstUrl = urls[0].trim()
        const urlObj = new URL(firstUrl)
        const domain = urlObj.hostname.replace(/^www\./, '')
        message.error(`등록되지 않은 사이트입니다: ${domain}\n설정에서 사이트를 먼저 등록해주세요.`)
      }
      catch (error) {
        message.error('올바른 URL을 입력해주세요.')
      }
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

        // 검색엔진이 선택되지 않았으면 활성화된 모든 검색엔진 사용
        let services = (taskValues.services || []) as any[]
        if (services.length === 0) {
          services = getAvailableServices(globalSettings, currentSite)
          message.info(`활성화된 모든 검색엔진(${services.join(', ')})에 색인을 시작합니다.`)
        }

        // 네이버가 포함되어 있지만 로그인되지 않은 경우 네이버만 제외
        if (services.includes('naver') && !naverLoginStatus?.isLoggedIn) {
          services = services.filter(s => s !== 'naver')
          message.warning('네이버는 로그인이 필요하여 제외되었습니다. 다른 검색엔진으로 색인을 진행합니다.')

          if (services.length === 0) {
            message.error('네이버 로그인이 필요하거나 다른 검색엔진을 활성화해주세요.')
            setLoading(false)
            return
          }
        }
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
          siteId: currentSite.id!,
          siteUrl: currentSite.siteUrl,
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
    const { siteId, siteUrl, urls, services, _groupedUrls } = values
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

    // URL 입력 필드와 상태 초기화
    if (!_groupedUrls) {
      form.resetFields(['urls'])
      setUrlsInput('')
    }

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
              result = await bingManualIndex({ siteId, urls: urlsForService })
              break
            case 'google':
              result = await googleManualIndex({ siteId, urls: urlsForService, type: 'URL_UPDATED' })
              break
            case 'naver':
              if (!naverLoginStatus?.isLoggedIn) {
                throw new Error('네이버 로그인이 필요합니다.')
              }
              result = await naverManualIndex({ siteId, urlsToIndex: urlsForService })
              break
            case 'daum':
              result = await daumManualIndex({ siteId, urlsToIndex: urlsForService })
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
        if (service === 'bing') {
          const isBingSuccess = (result.data && (result.data.success || result.data.d === null || Object.keys(result.data).length === 0))
          if (isBingSuccess) {
            const urlsForService = task._groupedUrls?.[service] || task.urls
            urlsForService.forEach((url, urlIndex) => {
              flatList.push({
                id: `${service}-${url}-${serviceIndex}-${urlIndex}`,
                service,
                url,
                status: 'success',
                message: '요청 성공',
                rawData: result.data,
              })
            })
            return
          }
        }
        if (Array.isArray(result.data.results)) {
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

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={16}>
        <Col span={24}>
          <Card title={<Title level={4}>새 인덱싱 작업</Title>}>
            <div style={{ marginBottom: '16px' }}>
              {selectedSite
                ? (
                    <Alert
                      message={`감지된 사이트: ${selectedSite.name} (${selectedSite.siteUrl})`}
                      type="success"
                      showIcon
                      action={(
                        <Button
                          size="small"
                          type="text"
                          onClick={() => {
                            setSelectedSite(null)
                            setUrlsInput('')
                          }}
                        >
                          초기화
                        </Button>
                      )}
                      style={{ marginBottom: 16 }}
                    />
                  )
                : urlsInput.trim()
                  ? (
                      <Alert
                        message="등록되지 않은 사이트입니다. 설정에서 사이트를 먼저 등록해주세요."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )
                  : null}

              {/* 디버그 정보 */}
              <div style={{ background: '#f0f0f0', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
                <div><strong>디버그 정보:</strong></div>
                <div>
                  Global Settings:
                  {globalSettings ? 'Loaded' : 'Not Loaded'}
                </div>
                <div>
                  Selected Site:
                  {selectedSite ? selectedSite.name : 'None'}
                </div>
                <div>
                  Available Services: [
                  {getAvailableServices(globalSettings, selectedSite).join(', ')}
                  ]
                </div>
                {selectedSite && (
                  <div>
                    Site Configs: Google(
                    {selectedSite.googleConfig?.use ? 'ON' : 'OFF'}
                    ),
                    Bing(
                    {selectedSite.bingConfig?.use ? 'ON' : 'OFF'}
                    ),
                    Naver(
                    {selectedSite.naverConfig?.use ? 'ON' : 'OFF'}
                    ),
                    Daum(
                    {selectedSite.daumConfig?.use ? 'ON' : 'OFF'}
                    )
                  </div>
                )}
              </div>
            </div>
            <Form
              form={form}
              layout="vertical"
              onFinish={async values =>
                await handleManualIndexing({
                  urls: urlsInput.split('\n').filter((u: string) => u.trim() !== ''),
                  services: values.services,
                })}
            >
              <Form.Item name="urls" label="URL 목록" rules={[{ required: true, message: 'URL을 입력해주세요' }]}>
                <TextArea
                  rows={6}
                  placeholder="한 줄에 하나씩 URL을 입력해주세요. 입력하시면 자동으로 사이트가 감지됩니다."
                  value={urlsInput}
                  onChange={(e) => {
                    setUrlsInput(e.target.value)
                    form.setFieldsValue({ urls: e.target.value })
                  }}
                />
              </Form.Item>
              <Form.Item
                name="services"
                label={(
                  <span>
                    검색 엔진
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      (선택 안하면 활성화된 모든 엔진 사용)
                    </Text>
                  </span>
                )}
              >
                <Checkbox.Group>
                  <Space wrap>
                    {getAvailableServices(globalSettings, selectedSite).map(service => (
                      <Checkbox
                        key={service}
                        value={service}
                      >
                        <Space>
                          {getServiceIcon(service)}
                          {' '}
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                          {service === 'naver' && !naverLoginStatus?.isLoggedIn && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              (로그인 필요)
                            </Text>
                          )}
                        </Space>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
                {getAvailableServices(globalSettings, selectedSite).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      활성화된 검색엔진:
                      {' '}
                      {getAvailableServices(globalSettings, selectedSite).join(', ')}
                    </Text>
                  </div>
                )}
              </Form.Item>
              {globalSettings?.naver?.use && (
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text strong>
                      <UserOutlined style={{ marginRight: 8 }} />
                      네이버 계정 관리
                    </Text>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setIsNaverAccountModalVisible(true)}
                    >
                      계정 관리
                    </Button>
                  </div>

                  {naverAccounts.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        등록된 네이버 계정들:
                      </Text>
                      <Space wrap>
                        {naverAccounts.map(account => (
                          <Tag
                            key={account.id}
                            color={account.isLoggedIn ? 'green' : 'default'}
                            icon={account.isLoggedIn ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                          >
                            {account.name}
                            {' '}
                            (
                            {account.naverId}
                            )
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}

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
                  disabled={loading || getAvailableServices(globalSettings, selectedSite).length === 0 || !urlsInput.trim()}
                >
                  인덱싱 시작
                </Button>
                {getAvailableServices(globalSettings, selectedSite).length === 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, color: '#ff4d4f' }}>
                      {selectedSite ? '선택된 사이트에 활성화된 검색엔진이 없습니다. 설정에서 검색엔진을 활성화해주세요.' : '설정에서 검색엔진을 먼저 활성화해주세요.'}
                    </Text>
                  </div>
                )}
                {!urlsInput.trim() && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, color: '#ff4d4f' }}>
                      URL을 입력해주세요.
                    </Text>
                  </div>
                )}
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

      {/* 네이버 계정 관리 모달 */}
      <Modal
        title="네이버 계정 관리"
        open={isNaverAccountModalVisible}
        onCancel={() => {
          setIsNaverAccountModalVisible(false)
          setIsAddingNaverAccount(false)
          naverAccountForm.resetFields()
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddingNaverAccount(true)}
            disabled={isAddingNaverAccount}
          >
            새 계정 추가
          </Button>
        </div>

        {isAddingNaverAccount && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Form
              form={naverAccountForm}
              layout="vertical"
              onFinish={async (values) => {
                try {
                  await createNaverAccount(values)
                  message.success('네이버 계정이 추가되었습니다.')
                  await loadNaverAccounts()
                  setIsAddingNaverAccount(false)
                  naverAccountForm.resetFields()
                }
                catch (error) {
                  message.error(`계정 추가 실패: ${getErrorMessage(error)}`)
                }
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="name"
                    label="계정 이름"
                    rules={[{ required: true, message: '계정 이름을 입력해주세요' }]}
                  >
                    <Input placeholder="예: 메인 블로그 계정" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="naverId"
                    label="네이버 아이디"
                    rules={[{ required: true, message: '네이버 아이디를 입력해주세요' }]}
                  >
                    <Input placeholder="naver_id" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="password"
                    label="비밀번호"
                    rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
                  >
                    <Input.Password placeholder="password" />
                  </Form.Item>
                </Col>
              </Row>
              <Space>
                <Button type="primary" htmlType="submit">
                  추가
                </Button>
                <Button onClick={() => {
                  setIsAddingNaverAccount(false)
                  naverAccountForm.resetFields()
                }}
                >
                  취소
                </Button>
              </Space>
            </Form>
          </Card>
        )}

        <Table
          dataSource={naverAccounts}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: '계정 이름',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: '네이버 아이디',
              dataIndex: 'naverId',
              key: 'naverId',
            },
            {
              title: '로그인 상태',
              dataIndex: 'isLoggedIn',
              key: 'isLoggedIn',
              render: (isLoggedIn: boolean) => (
                <Tag color={isLoggedIn ? 'green' : 'default'}>
                  {isLoggedIn ? '로그인됨' : '로그인 필요'}
                </Tag>
              ),
            },
            {
              title: '마지막 로그인',
              dataIndex: 'lastLogin',
              key: 'lastLogin',
              render: (lastLogin: string) =>
                lastLogin ? new Date(lastLogin).toLocaleDateString() : '-',
            },
            {
              title: '활성 상태',
              dataIndex: 'isActive',
              key: 'isActive',
              render: (isActive: boolean) => (
                <Tag color={isActive ? 'blue' : 'default'}>
                  {isActive ? '활성' : '비활성'}
                </Tag>
              ),
            },
            {
              title: '작업',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={async () => {
                      try {
                        await updateNaverAccount(record.id, { isActive: !record.isActive })
                        message.success('계정 상태가 변경되었습니다.')
                        await loadNaverAccounts()
                      }
                      catch (error) {
                        message.error(`상태 변경 실패: ${getErrorMessage(error)}`)
                      }
                    }}
                  >
                    {record.isActive ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: '계정 삭제',
                        content: `정말로 "${record.name}" 계정을 삭제하시겠습니까?`,
                        onOk: async () => {
                          try {
                            await deleteNaverAccount(record.id)
                            message.success('계정이 삭제되었습니다.')
                            await loadNaverAccounts()
                          }
                          catch (error) {
                            message.error(`계정 삭제 실패: ${getErrorMessage(error)}`)
                          }
                        },
                      })
                    }}
                  >
                    삭제
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  )
}

export default IndexingDashboard

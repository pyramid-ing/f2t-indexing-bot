import type { NaverLoginStatus, SiteConfig } from '../../api'
import type { DetailedResult } from './IndexingDetailModal'
import type { IndexingTask } from './useIndexingTasks'
import { GlobalOutlined, GoogleOutlined, PlayCircleOutlined, YahooOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Form, Input, message, Row, Select, Typography } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import {
  bingManualIndex,
  checkExistingUrls,
  checkNaverLoginComplete,
  checkNaverLoginStatus,
  closeNaverLoginBrowser,
  daumManualIndex,
  findSiteConfigByUrl,
  getAllNaverAccounts,
  getAllSiteConfigs,
  getErrorDetails,
  getErrorMessage,
  googleManualIndex,
  naverManualIndex,
  openNaverLoginBrowser,
} from '../../api'
import NaverLoginList from '../NaverLoginList'
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
  const [naverLoginStatus, setNaverLoginStatus] = useState<NaverLoginStatus | null>(null)
  const [naverLoginChecking, setNaverLoginChecking] = useState(false)
  const [naverLoginBrowserOpen, setNaverLoginBrowserOpen] = useState(false)
  // NaverAccount 관련 상태 제거 - 이제 사이트별 설정으로 관리
  const [form] = Form.useForm()
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<{ status: string; services: string[] }>({ status: 'all', services: [] })
  const [domainAlert, setDomainAlert] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  useEffect(() => {
    loadSites()
  }, [])

  // 선택된 사이트가 변경될 때마다 네이버 로그인 상태 체크
  useEffect(() => {
    if (selectedSite?.naverConfig?.use) {
      checkNaverLogin()
    }
  }, [selectedSite])

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
        } else {
          setSelectedSite(null)
        }
      } catch (error) {
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
    } catch (error) {
      message.error('사이트 목록을 불러오는 데 실패했습니다.')
    }
  }

  const getAvailableServices = (site = selectedSite) => {
    // 선택된 사이트의 설정만 사용
    if (!site) {
      return []
    }
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

  // URL 정제 및 검증 함수
  const cleanAndValidateUrl = (url: string): { isValid: boolean; cleanUrl: string; domain: string } => {
    let cleanUrl = url.trim()

    // @ 문자나 기타 특수문자로 시작하는 경우 제거
    cleanUrl = cleanUrl.replace(/^[@#\s]+/, '')

    // 프로토콜이 없으면 https:// 추가
    if (cleanUrl && !cleanUrl.match(/^https?:\/\//)) {
      cleanUrl = 'https://' + cleanUrl
    }

    try {
      const urlObj = new URL(cleanUrl)
      const domain = `${urlObj.protocol}//${urlObj.hostname}`.replace(/www\./g, '')
      return {
        isValid: true,
        cleanUrl,
        domain,
      }
    } catch {
      return {
        isValid: false,
        cleanUrl,
        domain: '',
      }
    }
  }

  // 도메인 일치 체크 함수
  const validateUrlDomains = (urls: string[]): { isValid: boolean; message: string } => {
    if (urls.length <= 1) {
      return { isValid: true, message: '' }
    }

    const validUrls: { url: string; domain: string }[] = []
    const invalidUrls: string[] = []

    // 모든 URL 검증 및 도메인 추출
    urls.forEach(url => {
      const result = cleanAndValidateUrl(url)
      if (result.isValid && result.domain) {
        validUrls.push({ url: result.cleanUrl, domain: result.domain })
      } else {
        invalidUrls.push(url)
      }
    })

    // 유효하지 않은 URL이 있는 경우
    if (invalidUrls.length > 0) {
      return {
        isValid: false,
        message: `유효하지 않은 URL이 포함되어 있습니다:\n${invalidUrls.join('\n')}\n\n올바른 URL 형식으로 입력해주세요.`,
      }
    }

    // 유효한 URL들의 도메인 검사
    const uniqueDomains = [...new Set(validUrls.map(item => item.domain))]

    if (uniqueDomains.length > 1) {
      return {
        isValid: false,
        message: `여러 도메인이 감지되었습니다. 한 번에 하나의 도메인만 인덱싱 할 수 있습니다.\n\n감지된 도메인:\n${uniqueDomains.join('\n')}`,
      }
    }

    return { isValid: true, message: '' }
  }

  const handleManualIndexing = async (taskValues: Partial<IndexingTask>) => {
    // Alert 숨기기
    setDomainAlert({ visible: false, message: '' })

    const urls = Array.isArray(taskValues.urls)
      ? taskValues.urls
      : (taskValues.urls as string).split('\n').filter(u => u.trim() !== '')

    if (urls.length === 0) {
      message.error('URL을 입력해주세요.')
      return
    }

    // 도메인 일치 검증
    const domainValidation = validateUrlDomains(urls)
    if (!domainValidation.isValid) {
      setDomainAlert({
        visible: true,
        message: domainValidation.message,
      })
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
      } catch (error) {
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
      } catch (error) {
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

        // 활성화된 모든 검색엔진 사용
        let services = getAvailableServices(currentSite)
        if (services.length === 0) {
          message.error('활성화된 검색엔진이 없습니다. 설정에서 검색엔진을 먼저 활성화해주세요.')
          setLoading(false)
          return
        }
        message.info(`활성화된 검색엔진(${services.join(', ')})에 색인을 시작합니다.`)

        const existingUrlsByProvider = await checkExistingUrls(urlList, services)
        const groupedUrlsToSubmit = services.reduce(
          (acc, service) => {
            const existingForService = existingUrlsByProvider[service.toUpperCase()] || []
            const urlsToSubmit = urlList.filter(url => !existingForService.includes(url))
            if (urlsToSubmit.length > 0) acc[service] = urlsToSubmit
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
      } catch (error) {
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
        if (!urlsForService || urlsForService.length === 0) continue

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
              result = await naverManualIndex({ siteId, urlsToIndex: urlsForService })
              break
            case 'daum':
              result = await daumManualIndex({ siteId, urlsToIndex: urlsForService })
              break
          }
          updateTask(taskId, t => ({ ...t, results: { ...t.results, [service]: { status: 'success', data: result } } }))
        } catch (error) {
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
      } else {
        message.success('모든 서비스에서 인덱싱이 성공적으로 완료되었습니다.')
      }
    } catch (error) {
      updateTask(taskId, t => ({ ...t, status: 'failed', endTime: Date.now() }))
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

  const showTaskDetail = (task: IndexingTask) => {
    const flattened = flattenResults(task)
    setDetailedResults(flattened)
    setSelectedTask(task)
    setIsModalVisible(true)
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
        if (detailedResults) {
          processIndividualResults(detailedResults)
        } else {
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
      } else if (result.status === 'success' && result.data) {
        if (service === 'bing') {
          const isBingSuccess =
            result.data && (result.data.success || result.data.d === null || Object.keys(result.data).length === 0)
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
        // 구글 인덱싱의 새로운 응답 구조 처리
        if (service === 'google') {
          console.log('Google indexing result structure:', result.data)

          // 다양한 구조 확인 (result.data 직접 또는 result.data.data)
          const googleData = result.data?.data || result.data

          if (googleData?.successUrls || googleData?.failedUrls) {
            // 성공한 URL들 처리
            if (googleData.successUrls && Array.isArray(googleData.successUrls)) {
              googleData.successUrls.forEach((successItem: any, index: number) => {
                flatList.push({
                  id: `${service}-${successItem.url}-${serviceIndex}-success-${index}`,
                  service,
                  url: successItem.url,
                  status: 'success',
                  message: '요청 성공',
                  rawData: successItem.data || successItem,
                })
              })
            }

            // 실패한 URL들 처리
            if (googleData.failedUrls && Array.isArray(googleData.failedUrls)) {
              googleData.failedUrls.forEach((failedItem: any, index: number) => {
                flatList.push({
                  id: `${service}-${failedItem.url}-${serviceIndex}-failed-${index}`,
                  service,
                  url: failedItem.url,
                  status: 'failed',
                  message: failedItem.error || '요청 실패',
                  rawData: failedItem.errorDetails || failedItem,
                })
              })
            }

            // 구글 결과 처리 완료, 다른 처리로 넘어가지 않도록 return
            return
          }
        }

        if (Array.isArray(result.data.results)) {
          processIndividualResults(result.data.results)
        } else if (Array.isArray(result.data)) {
          processIndividualResults(result.data)
        }
      } else if (result.status === 'running') {
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
    if (itemsToReRequest.length === 0) return message.warning('재요청할 항목을 선택해주세요.')

    const groupedByService = itemsToReRequest.reduce(
      (acc, item) => {
        if (!acc[item.service]) acc[item.service] = []
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
    if (!isSingle) setSelectedRowKeys([])
  }

  const filteredDetailedResults = useMemo(() => {
    return detailedResults.filter(item => {
      const statusMatch = filters.status === 'all' || item.status === filters.status
      const serviceMatch = filters.services.length === 0 || filters.services.includes(item.service)
      return statusMatch && serviceMatch
    })
  }, [detailedResults, filters])

  const checkNaverLogin = async () => {
    if (!selectedSite?.naverConfig?.use) {
      setNaverLoginStatus(null)
      return
    }

    setNaverLoginChecking(true)
    try {
      // 사이트별 네이버 계정 ID 확인
      const naverAccountId = selectedSite.naverConfig.selectedNaverAccountId

      let naverId: string | undefined = undefined
      if (naverAccountId) {
        // 네이버 계정 ID로 naverId 조회
        try {
          const accounts = await getAllNaverAccounts()
          const account = accounts.find(acc => acc.id === naverAccountId)
          if (account) {
            naverId = account.naverId
          }
        } catch (error) {
          console.error('네이버 계정 조회 실패:', error)
        }
      }

      const status = await checkNaverLoginStatus(naverId)
      setNaverLoginStatus(status)
    } catch (error) {
      console.error('네이버 로그인 상태 확인 실패:', error)
      setNaverLoginStatus({ isLoggedIn: false, needsLogin: true, message: '로그인 상태 확인 실패' })
    } finally {
      setNaverLoginChecking(false)
    }
  }

  const handleNaverLogin = async () => {
    try {
      // 사이트별 네이버 계정 ID 확인
      const naverAccountId = selectedSite?.naverConfig?.selectedNaverAccountId

      let naverId: string | undefined = undefined
      if (naverAccountId) {
        // 네이버 계정 ID로 naverId 조회
        try {
          const accounts = await getAllNaverAccounts()
          const account = accounts.find(acc => acc.id === naverAccountId)
          if (account) {
            naverId = account.naverId
          }
        } catch (error) {
          console.error('네이버 계정 조회 실패:', error)
        }
      }

      const result = await openNaverLoginBrowser(naverId)
      if (result.success) {
        setNaverLoginBrowserOpen(true)
        message.info('네이버 로그인 창이 열렸습니다. 수동으로 로그인해주세요.')
        const checkInterval = setInterval(async () => {
          try {
            const completeResult = await checkNaverLoginComplete(naverId)
            if (completeResult.success) {
              clearInterval(checkInterval)
              setNaverLoginBrowserOpen(false)
              message.success('네이버 로그인이 완료되었습니다!')
              await checkNaverLogin()
            }
          } catch (error) {
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

  return (
    <div style={{ padding: '16px' }}>
      <Row gutter={[16, 16]}>
        <Col
          xs={24} // 모바일: 전체 폭
          sm={24} // 작은 태블릿: 전체 폭
          md={24} // 태블릿: 전체 폭
          lg={16} // 데스크탑: 좌측 2/3
          xl={16} // 큰 데스크탑: 좌측 2/3
        >
          <Card title={<Title level={4}>새 인덱싱 작업</Title>}>
            <div style={{ marginBottom: '16px' }}>
              {/* 도메인 불일치 경고 Alert */}
              {domainAlert.visible && (
                <Alert
                  message="등록 불가"
                  description={domainAlert.message}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setDomainAlert({ visible: false, message: '' })}
                  style={{ marginBottom: 16, whiteSpace: 'pre-line' }}
                />
              )}

              {/* 기존 사이트 감지 Alert */}
              {selectedSite ? (
                <Alert
                  message={`감지된 사이트: ${selectedSite.name} (${selectedSite.siteUrl})`}
                  type="success"
                  showIcon
                  action={
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
                  }
                  style={{ marginBottom: 16 }}
                />
              ) : urlsInput.trim() ? (
                <Alert
                  message="등록되지 않은 사이트입니다. 설정에서 사이트를 먼저 등록해주세요."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : null}
            </div>
            <Form
              form={form}
              layout="vertical"
              onFinish={async values =>
                await handleManualIndexing({
                  urls: urlsInput.split('\n').filter((u: string) => u.trim() !== ''),
                })
              }
            >
              <Form.Item name="urls" label="URL 목록" rules={[{ required: true, message: 'URL을 입력해주세요' }]}>
                <TextArea
                  rows={6}
                  placeholder="한 줄에 하나씩 URL을 입력해주세요. 입력하시면 자동으로 사이트가 감지됩니다."
                  value={urlsInput}
                  onChange={e => {
                    setUrlsInput(e.target.value)
                    form.setFieldsValue({ urls: e.target.value })
                  }}
                />
              </Form.Item>
              {getAvailableServices(selectedSite).length > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: '#f6f8fa',
                    borderRadius: 6,
                    border: '1px solid #d1d9e0',
                  }}
                >
                  <Text strong style={{ color: '#0969da' }}>
                    사용할 검색엔진:
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Row gutter={[8, 8]}>
                      {getAvailableServices(selectedSite).map(service => (
                        <Col key={service} xs={12} sm={8} md={6} lg={6}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              backgroundColor: '#fff',
                              borderRadius: '4px',
                              border: '1px solid #e1e4e8',
                            }}
                          >
                            {getServiceIcon(service)}
                            <Text style={{ marginLeft: 4, fontSize: '12px' }}>
                              {service.charAt(0).toUpperCase() + service.slice(1)}
                            </Text>
                            {service === 'naver' && !naverLoginStatus?.isLoggedIn && (
                              <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                                (로그인 필요)
                              </Text>
                            )}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                    설정에서 활성화된 검색엔진들이 자동으로 사용됩니다.
                  </Text>
                </div>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<PlayCircleOutlined />}
                  disabled={loading || getAvailableServices(selectedSite).length === 0 || !urlsInput.trim()}
                  size="large"
                  style={{ width: '100%' }}
                >
                  인덱싱 시작
                </Button>
                {getAvailableServices(selectedSite).length === 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, color: '#ff4d4f' }}>
                      {selectedSite
                        ? '선택된 사이트에 활성화된 검색엔진이 없습니다. 설정에서 검색엔진을 활성화해주세요.'
                        : '설정에서 검색엔진을 먼저 활성화해주세요.'}
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
        <Col
          xs={24} // 모바일: 전체 폭 (하단으로 이동)
          sm={24} // 작은 태블릿: 전체 폭 (하단으로 이동)
          md={24} // 태블릿: 전체 폭 (하단으로 이동)
          lg={8} // 데스크탑: 우측 1/3
          xl={8} // 큰 데스크탑: 우측 1/3
        >
          <NaverLoginList />
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

      {/* 네이버 계정 관리 모달 제거 - 이제 사이트별 설정으로 관리 */}
    </div>
  )
}

export default IndexingDashboard

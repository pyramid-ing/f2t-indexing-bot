import type { NaverLoginStatus, SiteConfig, IndexProvider } from '../../api'
import type { DetailedResult } from './IndexingDetailModal'
import type { IndexingTask } from './useIndexingTasks'
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
  getAllSiteConfigs,
  getErrorMessage,
  googleManualIndex,
  naverManualIndex,
  openNaverLoginBrowser,
} from '../../api'
import NaverLoginList from '../NaverLoginList'
import IndexingDetailModal from './IndexingDetailModal'
import IndexingTaskTable from './IndexingTaskTable'
import ScheduledPostsTable from '../../features/work-management/ScheduledPostsTable'

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
  const [form] = Form.useForm()
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<{ status: string; services: string[] }>({ status: 'all', services: [] })
  const [domainAlert, setDomainAlert] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    if (selectedSite?.naverConfig?.use) {
      checkNaverLogin()
    }
  }, [selectedSite])

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

    const timeoutId = setTimeout(detectSiteFromUrls, 500)
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
    if (!site) return []
    const services = []
    if (site.googleConfig?.use) services.push('google')
    if (site.bingConfig?.use) services.push('bing')
    if (site.naverConfig?.use) services.push('naver')
    if (site.daumConfig?.use) services.push('daum')
    return services
  }

  const cleanAndValidateUrl = (url: string): { isValid: boolean; cleanUrl: string; domain: string } => {
    let cleanUrl = url.trim()
    cleanUrl = cleanUrl.replace(/^[@#\s]+/, '')
    if (cleanUrl && !cleanUrl.match(/^https?:\/\//)) {
      cleanUrl = 'https://' + cleanUrl
    }

    try {
      const urlObj = new URL(cleanUrl)
      const domain = `${urlObj.protocol}//${urlObj.hostname}`.replace(/www\./g, '')
      return { isValid: true, cleanUrl, domain }
    } catch {
      return { isValid: false, cleanUrl, domain: '' }
    }
  }

  const validateUrlDomains = (urls: string[]): { isValid: boolean; message: string } => {
    if (urls.length <= 1) return { isValid: true, message: '' }

    const validUrls: { url: string; domain: string }[] = []
    const invalidUrls: string[] = []

    urls.forEach(url => {
      const result = cleanAndValidateUrl(url)
      if (result.isValid && result.domain) {
        validUrls.push({ url: result.cleanUrl, domain: result.domain })
      } else {
        invalidUrls.push(url)
      }
    })

    if (invalidUrls.length > 0) {
      return {
        isValid: false,
        message: `유효하지 않은 URL이 포함되어 있습니다:\n${invalidUrls.join('\n')}\n\n올바른 URL 형식으로 입력해주세요.`,
      }
    }

    const uniqueDomains = [...new Set(validUrls.map(item => item.domain))]
    if (uniqueDomains.length > 1) {
      return {
        isValid: false,
        message: `여러 도메인이 감지되었습니다. 한 번에 하나의 도메인만 인덱싱 할 수 있습니다.\n\n감지된 도메인:\n${uniqueDomains.join('\n')}`,
      }
    }

    return { isValid: true, message: '' }
  }

  const handleSubmit = async (values: any) => {
    const urls = urlsInput.split('\n').filter(url => url.trim() !== '')
    if (urls.length === 0) {
      message.error('URL을 입력해주세요.')
      return
    }

    if (!selectedSite?.id) {
      message.error('사이트가 선택되지 않았습니다.')
      return
    }

    const domainValidation = validateUrlDomains(urls)
    if (!domainValidation.isValid) {
      setDomainAlert({ visible: true, message: domainValidation.message })
      return
    }
    setDomainAlert({ visible: false, message: '' })

    setLoading(true)
    try {
      const services = values.services || []
      const cleanUrls = urls.map(url => cleanAndValidateUrl(url).cleanUrl)
      const providers = services.map((s: string) => s.toUpperCase() as IndexProvider)

      const existingUrlsCheck = await checkExistingUrls(cleanUrls, providers)
      const existingUrlsList = Object.values(existingUrlsCheck).flat()
      if (existingUrlsList.length > 0) {
        message.warning(`다음 URL들이 이미 인덱싱 대기열에 있습니다:\n${existingUrlsList.join('\n')}`)
        return
      }

      for (const service of services) {
        switch (service) {
          case 'google':
            await googleManualIndex({ siteId: selectedSite.id, urls: cleanUrls, type: 'URL_UPDATED' })
            break
          case 'bing':
            await bingManualIndex({ siteId: selectedSite.id, urls: cleanUrls })
            break
          case 'naver':
            await naverManualIndex({ siteId: selectedSite.id, urlsToIndex: cleanUrls })
            break
          case 'daum':
            await daumManualIndex({ siteId: selectedSite.id, urlsToIndex: cleanUrls })
            break
        }
      }

      message.success('인덱싱 요청이 성공적으로 등록되었습니다.')
      setUrlsInput('')
      form.resetFields(['services'])
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      message.error(`인덱싱 요청 실패: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const checkNaverLogin = async () => {
    if (!selectedSite?.naverConfig?.use) return

    setNaverLoginChecking(true)
    try {
      const status = await checkNaverLoginStatus()
      setNaverLoginStatus(status)
    } catch (error) {
      console.error('네이버 로그인 상태 확인 실패:', error)
      message.error('네이버 로그인 상태 확인에 실패했습니다.')
    } finally {
      setNaverLoginChecking(false)
    }
  }

  const handleNaverLogin = async () => {
    try {
      await openNaverLoginBrowser()
      setNaverLoginBrowserOpen(true)

      const checkLoginComplete = async () => {
        try {
          const result = await checkNaverLoginComplete()
          if (result.success) {
            message.success('네이버 로그인이 완료되었습니다.')
            setNaverLoginBrowserOpen(false)
            await checkNaverLogin()
          } else {
            setTimeout(checkLoginComplete, 2000)
          }
        } catch (error) {
          console.error('네이버 로그인 완료 확인 실패:', error)
        }
      }

      checkLoginComplete()
    } catch (error) {
      console.error('네이버 로그인 브라우저 열기 실패:', error)
      message.error('네이버 로그인 브라우저를 열 수 없습니다.')
    }
  }

  const handleCloseNaverBrowser = async () => {
    try {
      await closeNaverLoginBrowser()
      setNaverLoginBrowserOpen(false)
      message.info('네이버 로그인 브라우저가 닫혔습니다.')
    } catch (error) {
      console.error('네이버 로그인 브라우저 닫기 실패:', error)
      message.error('네이버 로그인 브라우저를 닫는데 실패했습니다.')
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
        if (service === 'google') {
          console.log('Google indexing result structure:', result.data)

          const googleData = result.data?.data || result.data

          if (googleData?.successUrls || googleData?.failedUrls) {
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
    handleSubmit({
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

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Title level={4}>URL 인덱싱 요청</Title>
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item label="URL 목록" required>
                <TextArea
                  value={urlsInput}
                  onChange={e => setUrlsInput(e.target.value)}
                  placeholder="인덱싱할 URL을 입력하세요 (여러 URL은 줄바꿈으로 구분)"
                  rows={4}
                />
              </Form.Item>

              {domainAlert.visible && <Alert message={domainAlert.message} type="error" style={{ marginBottom: 16 }} />}

              {selectedSite && (
                <>
                  <Text type="secondary">감지된 사이트: {selectedSite.name}</Text>
                  <br />
                  <br />
                </>
              )}

              <Form.Item
                name="services"
                label="검색엔진 선택"
                required
                rules={[{ required: true, message: '하나 이상의 검색엔진을 선택해주세요.' }]}
              >
                <Select mode="multiple" placeholder="인덱싱할 검색엔진을 선택하세요">
                  {getAvailableServices().map(service => (
                    <Option key={service} value={service}>
                      {service.charAt(0).toUpperCase() + service.slice(1)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedSite?.naverConfig?.use && (
                <NaverLoginList
                  loginStatus={naverLoginStatus}
                  onLogin={handleNaverLogin}
                  onCloseBrowser={handleCloseNaverBrowser}
                  loading={naverLoginChecking}
                  browserOpen={naverLoginBrowserOpen}
                />
              )}

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  인덱싱 요청
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={24}>
          <ScheduledPostsTable />
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

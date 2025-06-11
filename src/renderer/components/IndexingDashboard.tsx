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
  Tooltip,
  Divider,
  Alert,
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
  EyeOutlined,
  LoginOutlined,
} from '@ant-design/icons'
import {
  getAllSiteConfigs,
  bingManualIndex,
  googleManualIndex,
  naverManualIndex,
  daumManualIndex,
  getGlobalSettings,
  SiteConfig,
  checkNaverLoginStatus,
  openNaverLoginBrowser,
  checkNaverLoginComplete,
  closeNaverLoginBrowser,
  NaverLoginStatus,
} from '../api'

const { Title, Text } = Typography
const { TextArea } = Input

interface IndexingTask {
  id: string
  siteUrl: string
  urls: string[]
  services: ('bing' | 'google' | 'naver' | 'daum')[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: Record<string, { status: 'success' | 'failed' | 'running'; data?: any; error?: string; progress?: number }>
  startTime: number
  endTime?: number
}

const IndexingDashboard: React.FC = () => {
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [indexingTasks, setIndexingTasks] = useState<IndexingTask[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<IndexingTask | null>(null)
  const [globalEngineSettings, setGlobalEngineSettings] = useState<any>(null)
  const [naverLoginStatus, setNaverLoginStatus] = useState<NaverLoginStatus | null>(null)
  const [naverLoginChecking, setNaverLoginChecking] = useState(false)
  const [naverLoginBrowserOpen, setNaverLoginBrowserOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSites()
    loadGlobalSettings()
  }, [])

  useEffect(() => {
    // 네이버가 활성화되어 있으면 로그인 상태 확인
    if (globalEngineSettings?.naver?.use) {
      checkNaverLogin()
    }
  }, [globalEngineSettings])

  const loadSites = async () => {
    try {
      const response = await getAllSiteConfigs()
      const siteList = response.data || []
      setSites(siteList)
      if (siteList.length > 0 && !selectedSite) {
        setSelectedSite(siteList[0].siteUrl)
      }
    } catch (error) {
      console.error('사이트 목록 로드 실패:', error)
      message.error('사이트 목록을 불러오는데 실패했습니다.')
    }
  }

  const loadGlobalSettings = async () => {
    try {
      const response = await getGlobalSettings()
      if (response.success && response.data) {
        setGlobalEngineSettings(response.data)
      }
    } catch (error) {
      console.error('전역 설정 로드 실패:', error)
      message.error('전역 설정을 불러오는데 실패했습니다.')
    }
  }

  const getSelectedSiteConfig = () => {
    return sites.find(site => site.siteUrl === selectedSite)
  }

  const getAvailableServices = () => {
    if (!globalEngineSettings) return []

    const services = []
    if (globalEngineSettings.google?.use) services.push('google')
    if (globalEngineSettings.bing?.use) services.push('bing')
    if (globalEngineSettings.naver?.use) services.push('naver')
    if (globalEngineSettings.daum?.use) services.push('daum')
    return services
  }

  const handleManualIndexing = () => {
    const siteConfig = getSelectedSiteConfig()
    if (!siteConfig) {
      message.error('사이트를 선택해주세요.')
      return
    }

    const availableServices = getAvailableServices()
    if (availableServices.length === 0) {
      message.error('설정에서 최소 하나의 검색엔진을 활성화해주세요.')
      return
    }

    form.setFieldsValue({
      urls: siteConfig.indexingUrls.join('\n'),
      services: availableServices, // 기본으로 모든 활성화된 서비스 선택
    })
    setModalVisible(true)
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
      startTime: Date.now(),
      results: {},
    }

    // 초기 결과 상태 설정
    services.forEach(service => {
      task.results![service] = { status: 'running', progress: 0 }
    })

    setIndexingTasks(prev => [task, ...prev])
    setModalVisible(false)
    setLoading(true)

    try {
      // 각 서비스별로 순차적으로 실행
      for (let i = 0; i < services.length; i++) {
        const service = services[i]

        // 진행 상황 업데이트
        setIndexingTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  results: {
                    ...t.results,
                    [service]: { status: 'running', progress: 0 },
                  },
                }
              : t,
          ),
        )

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
              // 네이버 로그인 상태 확인
              if (naverLoginStatus && !naverLoginStatus.isLoggedIn) {
                throw new Error('네이버 로그인이 필요합니다. 먼저 로그인을 완료해주세요.')
              }
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

          // 성공 상태 업데이트
          setIndexingTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    results: {
                      ...t.results,
                      [service]: { status: 'success', data: result, progress: 100 },
                    },
                  }
                : t,
            ),
          )
        } catch (error) {
          // 실패 상태 업데이트
          setIndexingTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    results: {
                      ...t.results,
                      [service]: { status: 'failed', error: error.message, progress: 100 },
                    },
                  }
                : t,
            ),
          )
        }
      }

      // 전체 작업 완료
      const finalTask = indexingTasks.find(t => t.id === taskId)
      const hasAnyFailure = finalTask?.results && Object.values(finalTask.results).some(r => r.status === 'failed')

      setIndexingTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: hasAnyFailure ? 'failed' : 'completed',
                endTime: Date.now(),
              }
            : t,
        ),
      )

      if (hasAnyFailure) {
        message.warning('일부 서비스에서 인덱싱에 실패했습니다. 상세 내용을 확인해주세요.')
      } else {
        message.success('모든 서비스에서 인덱싱이 성공적으로 완료되었습니다.')
      }
    } catch (error) {
      setIndexingTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: 'failed',
                endTime: Date.now(),
              }
            : t,
        ),
      )
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
    setSelectedTask(task)
    setDetailModalVisible(true)
  }

  const getExecutionTime = (task: IndexingTask) => {
    const endTime = task.endTime || Date.now()
    const duration = endTime - task.startTime
    return `${Math.round(duration / 1000)}초`
  }

  const taskColumns = [
    {
      title: '실행 시간',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (startTime: number) => new Date(startTime).toLocaleString(),
      width: 150,
    },
    {
      title: '사이트',
      dataIndex: 'siteUrl',
      key: 'siteUrl',
      width: 200,
    },
    {
      title: 'URL 수',
      dataIndex: 'urls',
      key: 'urlCount',
      render: (urls: string[]) => urls.length,
      width: 80,
    },
    {
      title: '검색엔진별 결과',
      key: 'serviceResults',
      render: (record: IndexingTask) => (
        <Space size="large">
          {record.services.includes('google') && (
            <Tooltip title={`Google: ${record.results?.google?.status || 'pending'}`}>
              <Space size={4}>
                <GoogleOutlined style={{ color: '#4285f4' }} />
                {getServiceStatusIcon('google', record.results)}
              </Space>
            </Tooltip>
          )}
          {record.services.includes('bing') && (
            <Tooltip title={`Bing: ${record.results?.bing?.status || 'pending'}`}>
              <Space size={4}>
                <YahooOutlined style={{ color: '#00809d' }} />
                {getServiceStatusIcon('bing', record.results)}
              </Space>
            </Tooltip>
          )}
          {record.services.includes('naver') && (
            <Tooltip title={`Naver: ${record.results?.naver?.status || 'pending'}`}>
              <Space size={4}>
                <GlobalOutlined style={{ color: '#03c75a' }} />
                {getServiceStatusIcon('naver', record.results)}
              </Space>
            </Tooltip>
          )}
          {record.services.includes('daum') && (
            <Tooltip title={`Daum: ${record.results?.daum?.status || 'pending'}`}>
              <Space size={4}>
                <GlobalOutlined style={{ color: '#0066cc' }} />
                {getServiceStatusIcon('daum', record.results)}
              </Space>
            </Tooltip>
          )}
        </Space>
      ),
      width: 200,
    },
    {
      title: '전체 상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          pending: 'default',
          running: 'processing',
          completed: 'success',
          failed: 'error',
        }
        const labels = {
          pending: '대기중',
          running: '실행중',
          completed: '완료',
          failed: '실패',
        }
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>
      },
      width: 100,
    },
    {
      title: '소요 시간',
      key: 'duration',
      render: (record: IndexingTask) => getExecutionTime(record),
      width: 100,
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: IndexingTask) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showTaskDetail(record)}>
          상세보기
        </Button>
      ),
      width: 100,
    },
  ]

  const siteConfig = getSelectedSiteConfig()
  const availableServices = getAvailableServices()

  const checkNaverLogin = async () => {
    if (!globalEngineSettings?.naver?.use) return

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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>인덱싱 대시보드</Title>
      </div>

      {/* 사이트 선택 및 통계 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="등록된 사이트" value={sites.length} prefix={<GlobalOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="완료된 작업"
              value={indexingTasks.filter(t => t.status === 'completed').length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="실패한 작업"
              value={indexingTasks.filter(t => t.status === 'failed').length}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
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

          {globalEngineSettings && (
            <div>
              <Text strong>활성화된 서비스: </Text>
              <Space>
                {globalEngineSettings.google?.use && (
                  <Tag color="blue" icon={<GoogleOutlined />}>
                    Google
                  </Tag>
                )}
                {globalEngineSettings.bing?.use && (
                  <Tag color="orange" icon={<YahooOutlined />}>
                    Bing
                  </Tag>
                )}
                {globalEngineSettings.naver?.use && (
                  <Tag color="green" icon={<GlobalOutlined />}>
                    Naver
                  </Tag>
                )}
                {globalEngineSettings.daum?.use && (
                  <Tag color="purple" icon={<GlobalOutlined />}>
                    Daum
                  </Tag>
                )}
                {availableServices.length === 0 && <Tag color="red">활성화된 서비스가 없습니다</Tag>}
              </Space>
            </div>
          )}

          {/* 네이버 로그인 상태 */}
          {globalEngineSettings?.naver?.use && (
            <div>
              <Text strong>네이버 로그인 상태: </Text>
              <Space>
                {naverLoginChecking ? (
                  <Tag icon={<LoadingOutlined />} color="blue">
                    확인 중...
                  </Tag>
                ) : naverLoginStatus ? (
                  naverLoginStatus.isLoggedIn ? (
                    <Tag icon={<CheckCircleOutlined />} color="green">
                      로그인됨
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="red">
                      로그인 필요
                    </Tag>
                  )
                ) : (
                  <Tag icon={<LoadingOutlined />} color="default">
                    상태 확인 중...
                  </Tag>
                )}

                {naverLoginBrowserOpen ? (
                  <Space>
                    <Button size="small" type="link" icon={<LoadingOutlined />} onClick={checkNaverLogin}>
                      로그인 완료 확인
                    </Button>
                    <Button size="small" type="link" danger onClick={handleCloseNaverBrowser}>
                      브라우저 닫기
                    </Button>
                  </Space>
                ) : naverLoginStatus && !naverLoginStatus.isLoggedIn ? (
                  <Button size="small" type="link" icon={<LoginOutlined />} onClick={handleNaverLogin}>
                    로그인하기
                  </Button>
                ) : (
                  <Button size="small" type="link" icon={<ReloadOutlined />} onClick={checkNaverLogin}>
                    상태 새로고침
                  </Button>
                )}
              </Space>

              {naverLoginStatus && !naverLoginStatus.isLoggedIn && (
                <div style={{ marginTop: 8 }}>
                  <Alert message="네이버 로그인 필요" description={naverLoginStatus.message} type="warning" showIcon />
                </div>
              )}
            </div>
          )}

          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleManualIndexing}
              disabled={!siteConfig || loading || availableServices.length === 0}
              loading={loading}
            >
              수동 인덱싱 실행
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadSites()
                loadGlobalSettings()
              }}
            >
              새로고침
            </Button>
          </Space>

          {availableServices.length === 0 && (
            <div
              style={{
                background: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 6,
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text type="danger">
                ⚠️ 활성화된 검색엔진이 없습니다. <strong>설정 → 검색엔진 설정</strong>에서 최소 하나의 검색엔진을
                활성화해주세요.
              </Text>
            </div>
          )}
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
          scroll={{ x: 1000 }}
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
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {globalEngineSettings?.google?.use && (
                  <Checkbox value="google">
                    <Space>
                      {getServiceIcon('google')}
                      <span>Google Indexing API</span>
                      <Tag color="blue">활성화됨</Tag>
                    </Space>
                  </Checkbox>
                )}
                {globalEngineSettings?.bing?.use && (
                  <Checkbox value="bing">
                    <Space>
                      {getServiceIcon('bing')}
                      <span>Bing URL Submission</span>
                      <Tag color="orange">활성화됨</Tag>
                    </Space>
                  </Checkbox>
                )}
                {globalEngineSettings?.naver?.use && (
                  <Checkbox value="naver" disabled={naverLoginStatus && !naverLoginStatus.isLoggedIn}>
                    <Space>
                      {getServiceIcon('naver')}
                      <span>Naver 웹마스터</span>
                      <Tag color="green">활성화됨</Tag>
                      {naverLoginStatus && !naverLoginStatus.isLoggedIn && (
                        <Tag color="red" icon={<CloseCircleOutlined />}>
                          로그인 필요
                        </Tag>
                      )}
                    </Space>
                  </Checkbox>
                )}
                {globalEngineSettings?.daum?.use && (
                  <Checkbox value="daum">
                    <Space>
                      {getServiceIcon('daum')}
                      <span>Daum 검색등록</span>
                      <Tag color="purple">활성화됨</Tag>
                    </Space>
                  </Checkbox>
                )}
                {availableServices.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#ff4d4f',
                      padding: 20,
                      background: '#fff2f0',
                      borderRadius: 6,
                      border: '1px dashed #ffccc7',
                    }}
                  >
                    <Text type="danger">
                      활성화된 검색엔진이 없습니다.
                      <br />
                      설정에서 검색엔진을 먼저 활성화해주세요.
                    </Text>
                  </div>
                )}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={loading} disabled={availableServices.length === 0}>
                실행
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 상세 결과 모달 */}
      <Modal
        title="인덱싱 작업 상세 결과"
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>사이트: </Text>
              <Text>{selectedTask.siteUrl}</Text>
              <br />
              <Text strong>실행 시간: </Text>
              <Text>{new Date(selectedTask.startTime).toLocaleString()}</Text>
              <br />
              <Text strong>소요 시간: </Text>
              <Text>{getExecutionTime(selectedTask)}</Text>
              <br />
              <Text strong>URL 수: </Text>
              <Text>{selectedTask.urls.length}개</Text>
            </div>

            <Divider>검색엔진별 결과</Divider>

            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedTask.services.map(service => {
                const result = selectedTask.results?.[service]
                const serviceNames = {
                  google: 'Google',
                  bing: 'Bing',
                  naver: 'Naver',
                  daum: 'Daum',
                }

                return (
                  <Card key={service} size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space>
                        {getServiceIcon(service)}
                        <Text strong>{serviceNames[service as keyof typeof serviceNames]}</Text>
                      </Space>
                      {getServiceStatusIcon(service, selectedTask.results)}
                    </div>

                    {result && (
                      <div style={{ marginTop: 8 }}>
                        {result.status === 'success' && result.data && (
                          <div>
                            <Text type="success">✓ 성공적으로 처리되었습니다</Text>
                            <pre
                              style={{
                                fontSize: 12,
                                background: '#f6ffed',
                                padding: 8,
                                borderRadius: 4,
                                marginTop: 8,
                                maxHeight: 150,
                                overflow: 'auto',
                              }}
                            >
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {result.status === 'failed' && (
                          <div>
                            <Text type="danger">✗ 실패: {result.error}</Text>
                          </div>
                        )}
                        {result.status === 'running' && (
                          <div>
                            <Text type="warning">⏳ 실행 중...</Text>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </Space>

            <Divider>처리된 URL 목록</Divider>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {selectedTask.urls.map((url, index) => (
                <div key={index} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text code>{url}</Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default IndexingDashboard

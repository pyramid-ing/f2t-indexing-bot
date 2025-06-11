import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  message,
  Typography,
  Avatar,
  Statistic,
  Space,
  Divider,
  Row,
  Col,
  InputNumber,
  Tabs,
} from 'antd'
import {
  GoogleOutlined,
  YahooOutlined,
  GlobalOutlined,
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  getGlobalEngineSettings,
  updateGlobalGoogleSettings,
  updateGlobalBingSettings,
  updateGlobalNaverSettings,
  updateGlobalDaumSettings,
} from '../api'
import { startGoogleLogin, getGoogleAuthStatus, logoutGoogle } from '../utils/googleAuth'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { TextArea } = Input

interface AppSettings {
  appVersion: string
  initialized: boolean
  setupCompleted: boolean
  theme: 'light' | 'dark'
  language: 'ko' | 'en'
  firstRun: boolean
}

interface IndexingSettings {
  defaultDelay: number
  maxRetries: number
  batchSize: number
  enableLogging: boolean
}

interface GlobalEngineSettings {
  google: {
    use: boolean
    serviceAccountEmail: string
    privateKey: string
    oauth2ClientId: string
    oauth2ClientSecret: string
  }
  bing: {
    use: boolean
    apiKey: string
  }
  naver: {
    use: boolean
    naverId: string
    password: string
  }
  daum: {
    use: boolean
    siteUrl: string
    password: string
  }
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)

  // 구글 OAuth 관련 state
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false)
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(null)

  // 블로거 설정 관련 state
  const [bloggerSettings, setBloggerSettings] = useState({
    autoIndex: false,
    selectedBlogs: [] as string[],
    indexOnPublish: true,
    batchSize: 10,
  })
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appVersion: '1.0.0',
    initialized: true,
    setupCompleted: true,
    theme: 'light',
    language: 'ko',
    firstRun: false,
  })
  const [indexingSettings, setIndexingSettings] = useState<IndexingSettings>({
    defaultDelay: 2000,
    maxRetries: 3,
    batchSize: 10,
    enableLogging: true,
  })
  const [engineSettings, setEngineSettings] = useState<GlobalEngineSettings>({
    google: {
      use: false,
      serviceAccountEmail: '',
      privateKey: '',
      oauth2ClientId: '',
      oauth2ClientSecret: '',
    },
    bing: {
      use: false,
      apiKey: '',
    },
    naver: {
      use: false,
      naverId: '',
      password: '',
    },
    daum: {
      use: false,
      siteUrl: '',
      password: '',
    },
  })

  const [indexingForm] = Form.useForm()
  const [googleForm] = Form.useForm()
  const [bingForm] = Form.useForm()
  const [naverForm] = Form.useForm()
  const [daumForm] = Form.useForm()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // 앱 상태에서 설정 정보 로드
      const response = await fetch('http://localhost:3030/site-config/app-status')
      const data = await response.json()

      if (data) {
        const settings: AppSettings = {
          appVersion: data.appVersion || '1.0.0',
          initialized: data.initialized || true,
          setupCompleted: data.setupCompleted || true,
          theme: 'light', // 기본값
          language: 'ko', // 기본값
          firstRun: data.firstRun || false,
        }
        setAppSettings(settings)
      }

      // 전역 엔진 설정 로드
      try {
        const engineData = await getGlobalEngineSettings()
        if (engineData) {
          setEngineSettings(engineData)
          googleForm.setFieldsValue(engineData.google)
          bingForm.setFieldsValue(engineData.bing)
          naverForm.setFieldsValue(engineData.naver)
          daumForm.setFieldsValue(engineData.daum)
        }
      } catch (engineError) {
        console.log('전역 엔진 설정 로드 실패 (첫 실행일 수 있음):', engineError)
        // 첫 실행이거나 설정이 없으면 기본값 사용
        googleForm.setFieldsValue(engineSettings.google)
        bingForm.setFieldsValue(engineSettings.bing)
        naverForm.setFieldsValue(engineSettings.naver)
        daumForm.setFieldsValue(engineSettings.daum)
      }

      // 인덱싱 설정 폼에 기본값 설정
      indexingForm.setFieldsValue(indexingSettings)

      // 구글 로그인 상태 확인은 useEffect에서 처리
    } catch (error) {
      console.error('설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveAppSettings = async (values: AppSettings) => {
    try {
      setLoading(true)
      // 실제로는 별도의 설정 저장 API가 필요하지만, 현재는 로컬 상태만 업데이트
      setAppSettings(values)
      message.success('일반 설정이 저장되었습니다.')
    } catch (error) {
      console.error('설정 저장 실패:', error)
      message.error('설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveIndexingSettings = async (values: IndexingSettings) => {
    try {
      setLoading(true)
      setIndexingSettings(values)
      message.success('인덱싱 설정이 저장되었습니다.')
    } catch (error) {
      console.error('설정 저장 실패:', error)
      message.error('설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveGoogleSettings = async (values: any) => {
    try {
      setLoading(true)
      await updateGlobalGoogleSettings(values)
      setEngineSettings(prev => ({ ...prev, google: values }))
      message.success('Google 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Google 설정 저장 실패:', error)
      message.error('Google 설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveBingSettings = async (values: any) => {
    try {
      setLoading(true)
      await updateGlobalBingSettings(values)
      setEngineSettings(prev => ({ ...prev, bing: values }))
      message.success('Bing 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Bing 설정 저장 실패:', error)
      message.error('Bing 설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveNaverSettings = async (values: any) => {
    try {
      setLoading(true)
      await updateGlobalNaverSettings(values)
      setEngineSettings(prev => ({ ...prev, naver: values }))
      message.success('Naver 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Naver 설정 저장 실패:', error)
      message.error('Naver 설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const saveDaumSettings = async (values: any) => {
    try {
      setLoading(true)
      await updateGlobalDaumSettings(values)
      setEngineSettings(prev => ({ ...prev, daum: values }))
      message.success('Daum 설정이 저장되었습니다.')
    } catch (error) {
      console.error('Daum 설정 저장 실패:', error)
      message.error('Daum 설정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth 상태 확인
  useEffect(() => {
    const checkGoogleAuthStatus = async () => {
      try {
        const status = await getGoogleAuthStatus()
        if (status.isLoggedIn && status.userInfo) {
          setIsGoogleLoggedIn(true)
          setGoogleUserInfo(status.userInfo)
        } else {
          setIsGoogleLoggedIn(false)
          setGoogleUserInfo(null)
        }
      } catch (error) {
        console.error('Google 인증 상태 확인 오류:', error)
        setIsGoogleLoggedIn(false)
        setGoogleUserInfo(null)
      }
    }

    if (engineSettings.google.oauth2ClientId) {
      checkGoogleAuthStatus()
    }
  }, [engineSettings.google.oauth2ClientId])

  // 주기적으로 OAuth 상태 확인 (30초마다)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (engineSettings.google.oauth2ClientId) {
        try {
          const status = await getGoogleAuthStatus()
          if (status.isLoggedIn && status.userInfo) {
            setIsGoogleLoggedIn(true)
            setGoogleUserInfo(status.userInfo)
          } else if (isGoogleLoggedIn) {
            // 이전에 로그인 상태였는데 지금 로그아웃 상태라면 UI 업데이트
            setIsGoogleLoggedIn(false)
            setGoogleUserInfo(null)
            message.info('Google 세션이 만료되었습니다.')
          }
        } catch (error) {
          console.error('Google 인증 상태 확인 오류:', error)
        }
      }
    }, 30000) // 30초마다 확인

    return () => clearInterval(interval)
  }, [engineSettings.google.oauth2ClientId, isGoogleLoggedIn])

  const handleGoogleLogin = async () => {
    if (!engineSettings.google.oauth2ClientId.trim()) {
      message.error('OAuth2 Client ID를 먼저 입력해주세요.')
      return
    }

    if (!engineSettings.google.oauth2ClientSecret.trim()) {
      message.error('OAuth2 Client Secret을 먼저 입력해주세요.')
      return
    }

    try {
      const result = startGoogleLogin(engineSettings.google.oauth2ClientId)
      message.info(result.message)

      // 주기적으로 로그인 상태 확인 (5초마다, 최대 2분)
      let attempts = 0
      const maxAttempts = 24 // 2분 (5초 * 24)

      const checkInterval = setInterval(async () => {
        attempts++
        try {
          const status = await getGoogleAuthStatus()
          if (status.isLoggedIn && status.userInfo) {
            clearInterval(checkInterval)
            setIsGoogleLoggedIn(true)
            setGoogleUserInfo(status.userInfo)
            message.success(`Google 계정 연동이 완료되었습니다. (${status.userInfo.email})`)

            // 엔진 설정 새로고침
            loadSettings()
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            message.warning('로그인 확인 시간이 초과되었습니다. 페이지를 새로고침해서 상태를 확인해주세요.')
          }
        } catch (error) {
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval)
            message.error('로그인 상태 확인 중 오류가 발생했습니다.')
          }
        }
      }, 5000)
    } catch (error: any) {
      console.error('Google 로그인 오류:', error)
      message.error(error.message || 'Google 로그인에 실패했습니다.')
    }
  }

  const handleGoogleLogout = async () => {
    try {
      const result = await logoutGoogle()
      setIsGoogleLoggedIn(false)
      setGoogleUserInfo(null)
      message.success(result.message)

      // 엔진 설정 새로고침
      loadSettings()
    } catch (error: any) {
      console.error('Google 로그아웃 오류:', error)
      message.error(error.message || 'Google 로그아웃에 실패했습니다.')
    }
  }

  const resetToDefaults = () => {
    const defaultSettings: AppSettings = {
      appVersion: appSettings.appVersion,
      initialized: true,
      setupCompleted: true,
      theme: 'light',
      language: 'ko',
      firstRun: false,
    }

    const defaultIndexingSettings: IndexingSettings = {
      defaultDelay: 2000,
      maxRetries: 3,
      batchSize: 10,
      enableLogging: true,
    }

    const defaultEngineSettings: GlobalEngineSettings = {
      google: {
        use: false,
        serviceAccountEmail: '',
        privateKey: '',
        oauth2ClientId: '',
        oauth2ClientSecret: '',
      },
      bing: {
        use: false,
        apiKey: '',
      },
      naver: {
        use: false,
        naverId: '',
        password: '',
      },
      daum: {
        use: false,
        siteUrl: '',
        password: '',
      },
    }

    setAppSettings(defaultSettings)
    setIndexingSettings(defaultIndexingSettings)
    setEngineSettings(defaultEngineSettings)
    indexingForm.setFieldsValue(defaultIndexingSettings)
    googleForm.setFieldsValue(defaultEngineSettings.google)
    bingForm.setFieldsValue(defaultEngineSettings.bing)
    naverForm.setFieldsValue(defaultEngineSettings.naver)
    daumForm.setFieldsValue(defaultEngineSettings.daum)
    message.success('기본값으로 초기화되었습니다.')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <SettingOutlined /> 설정
        </Title>
        <Text type="secondary">앱 설정과 인덱싱 옵션을 관리합니다.</Text>
      </div>

      <Tabs defaultActiveKey="engines" type="card">
        <TabPane tab="인덱싱 설정" key="indexing">
          <Card>
            <Form
              form={indexingForm}
              layout="vertical"
              onFinish={saveIndexingSettings}
              initialValues={indexingSettings}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="defaultDelay" label="기본 지연시간 (ms)" help="각 요청 사이의 지연시간">
                    <InputNumber min={500} max={10000} step={500} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="maxRetries" label="최대 재시도 횟수" help="실패시 재시도할 최대 횟수">
                    <InputNumber min={1} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="batchSize" label="배치 크기" help="한 번에 처리할 URL 개수">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="enableLogging" label="로깅 활성화" valuePropName="checked">
                    <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    인덱싱 설정 저장
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={resetToDefaults}>
                    기본값으로 초기화
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="검색엔진 설정" key="engines">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Google 설정 */}
            <Card
              title={
                <>
                  <GoogleOutlined style={{ color: '#4285f4' }} /> Google 설정
                </>
              }
            >
              <Form
                form={googleForm}
                layout="vertical"
                onFinish={saveGoogleSettings}
                initialValues={engineSettings.google}
              >
                <Form.Item name="use" label="Google 인덱싱 사용" valuePropName="checked">
                  <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="serviceAccountEmail"
                      label="Service Account Email"
                      help="Google Service Account의 이메일 주소"
                    >
                      <Input placeholder="example@project.iam.gserviceaccount.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="oauth2ClientId"
                      label="OAuth2 Client ID"
                      help="Google Cloud Console에서 생성한 Client ID"
                    >
                      <Input placeholder="123456789-xxx.apps.googleusercontent.com" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="oauth2ClientSecret" label="OAuth2 Client Secret" help="OAuth2 Client Secret">
                      <Input.Password placeholder="OAuth2 Client Secret" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="privateKey" label="Private Key" help="Service Account의 Private Key (JSON 형태)">
                  <TextArea
                    rows={4}
                    placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}'
                  />
                </Form.Item>

                {/* OAuth 로그인 섹션 */}
                <Divider>OAuth 로그인</Divider>
                {isGoogleLoggedIn && googleUserInfo ? (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>연동된 계정:</Text>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar src={googleUserInfo.picture} size={32} />
                      <div>
                        <div>{googleUserInfo.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {googleUserInfo.email}
                        </Text>
                      </div>
                      <Button type="link" danger onClick={handleGoogleLogout}>
                        연동 해제
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Google 계정이 연동되지 않았습니다.</Text>
                    <br />
                    <Button
                      type="primary"
                      icon={<GoogleOutlined />}
                      onClick={handleGoogleLogin}
                      disabled={
                        !engineSettings.google.oauth2ClientId.trim() || !engineSettings.google.oauth2ClientSecret.trim()
                      }
                      style={{ marginTop: 8 }}
                    >
                      Google 계정 연동
                    </Button>
                  </div>
                )}

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    Google 설정 저장
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Bing 설정 */}
            <Card
              title={
                <>
                  <YahooOutlined style={{ color: '#00809d' }} /> Bing 설정
                </>
              }
            >
              <Form form={bingForm} layout="vertical" onFinish={saveBingSettings} initialValues={engineSettings.bing}>
                <Form.Item name="use" label="Bing 인덱싱 사용" valuePropName="checked">
                  <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                </Form.Item>

                <Form.Item
                  name="apiKey"
                  label="Bing Webmaster API Key"
                  help="Bing Webmaster Tools에서 발급받은 API 키"
                  rules={[{ message: 'API 키를 입력해주세요' }]}
                >
                  <Input.Password placeholder="Bing Webmaster API Key" />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    Bing 설정 저장
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Naver 설정 */}
            <Card
              title={
                <>
                  <GlobalOutlined style={{ color: '#03c75a' }} /> Naver 설정
                </>
              }
            >
              <Form
                form={naverForm}
                layout="vertical"
                onFinish={saveNaverSettings}
                initialValues={engineSettings.naver}
              >
                <Form.Item name="use" label="Naver 인덱싱 사용" valuePropName="checked">
                  <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="naverId"
                      label="Naver ID"
                      help="네이버 웹마스터 도구 계정 ID"
                      rules={[{ message: 'Naver ID를 입력해주세요' }]}
                    >
                      <Input placeholder="naver_id" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="password"
                      label="비밀번호"
                      help="네이버 계정 비밀번호"
                      rules={[{ message: '비밀번호를 입력해주세요' }]}
                    >
                      <Input.Password placeholder="비밀번호" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    Naver 설정 저장
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            {/* Daum 설정 */}
            <Card
              title={
                <>
                  <GlobalOutlined style={{ color: '#0066cc' }} /> Daum 설정
                </>
              }
            >
              <Form form={daumForm} layout="vertical" onFinish={saveDaumSettings} initialValues={engineSettings.daum}>
                <Form.Item name="use" label="Daum 인덱싱 사용" valuePropName="checked">
                  <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="siteUrl"
                      label="사이트 URL"
                      help="Daum에 등록할 사이트 URL"
                      rules={[{ type: 'url', message: '올바른 URL을 입력해주세요' }]}
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="password" label="사이트 비밀번호" help="Daum 검색등록용 사이트 비밀번호">
                      <Input.Password placeholder="사이트 비밀번호" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    Daum 설정 저장
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Space>
        </TabPane>

        <TabPane tab="정보" key="about">
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>F2T 인덱싱 봇</Title>
                <Text>버전: {appSettings.appVersion}</Text>
              </div>

              <Divider />

              <div>
                <Title level={5}>지원하는 검색엔진</Title>
                <Space direction="vertical">
                  <Text>
                    <GoogleOutlined style={{ color: '#4285f4' }} /> Google - Indexing API
                  </Text>
                  <Text>
                    <YahooOutlined style={{ color: '#00809d' }} /> Bing - URL Submission API
                  </Text>
                  <Text>
                    <GlobalOutlined style={{ color: '#03c75a' }} /> Naver - 웹마스터 도구
                  </Text>
                  <Text>
                    <GlobalOutlined style={{ color: '#0066cc' }} /> Daum - 검색등록
                  </Text>
                </Space>
              </div>

              <Divider />

              <div>
                <Title level={5}>사용 방법</Title>
                <ol>
                  <li>사이트 관리에서 블로그 사이트를 추가합니다.</li>
                  <li>각 검색엔진별 API 키나 인증 정보를 설정합니다.</li>
                  <li>인덱싱 대시보드에서 수동으로 URL을 등록하거나 자동화합니다.</li>
                  <li>작업 이력에서 성공/실패 결과를 확인합니다.</li>
                </ol>
              </div>
            </Space>
          </Card>
        </TabPane>

        {/* 블로거 설정 탭 */}
        <TabPane tab="블로거 설정" key="blogger">
          <Card>
            <Form layout="vertical">
              <Form.Item>
                <Text strong style={{ fontSize: 16 }}>
                  Google 블로거 설정
                </Text>
                <br />
                <Text type="secondary">블로거 자동 인덱싱 및 게시물 관리 설정</Text>
              </Form.Item>

              <Form.Item label="자동 인덱싱 활성화">
                <Switch
                  checked={bloggerSettings.autoIndex}
                  onChange={checked => setBloggerSettings(prev => ({ ...prev, autoIndex: checked }))}
                  checkedChildren="활성화"
                  unCheckedChildren="비활성화"
                />
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    새 게시물 발행 시 자동으로 검색엔진에 인덱싱 요청
                  </Text>
                </div>
              </Form.Item>

              <Form.Item label="게시 시 즉시 인덱싱">
                <Switch
                  checked={bloggerSettings.indexOnPublish}
                  onChange={checked => setBloggerSettings(prev => ({ ...prev, indexOnPublish: checked }))}
                  checkedChildren="활성화"
                  unCheckedChildren="비활성화"
                />
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    블로거에서 게시물을 발행하는 즉시 인덱싱 실행
                  </Text>
                </div>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="배치 크기">
                    <InputNumber
                      min={1}
                      max={50}
                      value={bloggerSettings.batchSize}
                      onChange={value => setBloggerSettings(prev => ({ ...prev, batchSize: value || 10 }))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        한 번에 처리할 게시물 수
                      </Text>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              {/* 연동 상태 표시 */}
              <Divider>연동 상태</Divider>
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="Google 계정 연동"
                        value={isGoogleLoggedIn ? '연동됨' : '미연동'}
                        valueStyle={{ color: isGoogleLoggedIn ? '#3f8600' : '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="인덱싱 엔진"
                        value={engineSettings.google.use ? '활성화' : '비활성화'}
                        valueStyle={{ color: engineSettings.google.use ? '#3f8600' : '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="자동 인덱싱"
                        value={bloggerSettings.autoIndex ? '활성화' : '비활성화'}
                        valueStyle={{ color: bloggerSettings.autoIndex ? '#3f8600' : '#cf1322' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* 도움말 */}
              <div style={{ background: '#f6f8fa', padding: 16, borderRadius: 8, marginTop: 16 }}>
                <Text strong>설정 가이드:</Text>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>먼저 검색엔진 설정에서 Google 인덱싱을 활성화하고 OAuth 로그인을 완료하세요.</li>
                  <li>자동 인덱싱을 활성화하면 새 게시물이 자동으로 검색엔진에 등록됩니다.</li>
                  <li>배치 크기를 조절하여 한 번에 처리할 게시물 수를 제한할 수 있습니다.</li>
                </ul>
              </div>

              <Form.Item style={{ marginTop: 24 }}>
                <Space>
                  <Button type="primary" icon={<SaveOutlined />}>
                    블로거 설정 저장
                  </Button>
                  <Button icon={<ReloadOutlined />}>블로그 목록 새로고침</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {/* OAuth 인증 코드 입력 모달 */}
    </div>
  )
}

export default Settings

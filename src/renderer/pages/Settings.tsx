import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  message,
  Typography,
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
    oauth2AccessToken: string
    oauth2RefreshToken: string
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
      oauth2AccessToken: '',
      oauth2RefreshToken: '',
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
        oauth2AccessToken: '',
        oauth2RefreshToken: '',
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
                  <Col span={12}>
                    <Form.Item
                      name="oauth2AccessToken"
                      label="Access Token"
                      help="현재 활성화된 Access Token (선택사항)"
                    >
                      <Input placeholder="ya29.xxx" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="privateKey" label="Private Key" help="Service Account의 Private Key (JSON 형태)">
                  <TextArea
                    rows={4}
                    placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}'
                  />
                </Form.Item>

                <Form.Item name="oauth2RefreshToken" label="Refresh Token" help="OAuth2 Refresh Token (선택사항)">
                  <Input placeholder="1//xxx" />
                </Form.Item>

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
      </Tabs>
    </div>
  )
}

export default Settings

import React, { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Switch,
  Button,
  Alert,
  Card,
  Space,
  Typography,
  Tag,
  List,
  Modal,
  message,
  Select,
  DatePicker,
} from 'antd'
import {
  CalendarOutlined,
  GlobalOutlined,
  LoadingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  sitemapApi,
  SitemapConfig,
  CreateSitemapConfigDto,
  UpdateSitemapConfigDto,
  IndexingConfig,
} from '@render/api/sitemapApi'
import dayjs from 'dayjs'

const { Text, Title } = Typography
const { Option } = Select

const SITEMAP_TYPES = [
  { value: 'blogspot', label: 'Blogspot', description: 'Blogspot 블로그 사이트맵' },
  { value: 'tistory', label: '티스토리', description: '티스토리 블로그 사이트맵' },
  {
    value: 'wordpress',
    label: '워드프레스 (RankMath SEO)',
    description: '워드프레스 RankMath SEO 사이트맵',
    disabled: true,
  },
]

const INDEXING_MODES = [
  { value: 'recentCount', label: '최근 N개 글', description: '최신 글 N개만 색인' },
  { value: 'recentDays', label: '최근 N일', description: '최근 N일 이내 글만 색인' },
  { value: 'fromDate', label: '특정 날짜 이후', description: '특정 날짜 이후 글만 색인' },
  { value: 'all', label: '전체 색인', description: '모든 글 색인 (권장하지 않음)' },
]

interface SitemapSettingsProps {
  siteId: number
}

export const SitemapSettings: React.FC<SitemapSettingsProps> = ({ siteId }) => {
  const [configs, setConfigs] = useState<SitemapConfig[]>([])
  const [indexingConfig, setIndexingConfig] = useState<IndexingConfig>({
    mode: 'recentCount',
    count: 50,
  })
  const [modalVisible, setModalVisible] = useState(false)
  const [indexingModalVisible, setIndexingModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SitemapConfig | null>(null)
  const [form] = Form.useForm()
  const [indexingForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    loadSitemapConfigs()
    loadIndexingConfig()
  }, [siteId])

  const loadSitemapConfigs = async () => {
    try {
      setLoading(true)
      const data = await sitemapApi.getSitemapConfigs(siteId)
      setConfigs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadIndexingConfig = async () => {
    try {
      const config = await sitemapApi.getIndexingConfig(siteId)
      setIndexingConfig(config)
    } catch (err) {
      console.error('색인 기준 설정 로드 실패:', err)
    }
  }

  const handleAddConfig = () => {
    setEditingConfig(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditConfig = (config: SitemapConfig) => {
    setEditingConfig(config)
    form.setFieldsValue({
      name: config.name,
      sitemapType: config.sitemapType,
      isEnabled: config.isEnabled,
    })
    setModalVisible(true)
  }

  const handleDeleteConfig = async (id: string) => {
    try {
      setLoading(true)
      await sitemapApi.deleteSitemapConfig(id)
      message.success('사이트맵 설정이 삭제되었습니다.')
      await loadSitemapConfigs()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async (values: CreateSitemapConfigDto | UpdateSitemapConfigDto) => {
    try {
      setLoading(true)

      if (editingConfig) {
        await sitemapApi.updateSitemapConfig(editingConfig.id, values as UpdateSitemapConfigDto)
        message.success('사이트맵 설정이 수정되었습니다.')
      } else {
        await sitemapApi.createSitemapConfig(siteId, values as CreateSitemapConfigDto)
        message.success('사이트맵 설정이 추가되었습니다.')
      }

      setModalVisible(false)
      await loadSitemapConfigs()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveIndexingConfig = async (values: any) => {
    try {
      setLoading(true)

      const config: IndexingConfig = {
        mode: values.mode,
        count: values.count,
        days: values.days,
        startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
      }

      await sitemapApi.updateIndexingConfig(siteId, config)
      setIndexingConfig(config)
      setIndexingModalVisible(false)
      message.success('색인 기준 설정이 저장되었습니다.')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualParse = async () => {
    try {
      setParsing(true)
      const result = await sitemapApi.parseSitemap(siteId)
      message.success(result.message || '사이트맵 파싱이 완료되었습니다.')
      await loadSitemapConfigs() // 설정 목록 새로고침
    } catch (err) {
      message.error(err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다.')
    } finally {
      setParsing(false)
    }
  }

  const formatLastParsed = (dateString?: string) => {
    if (!dateString) return '파싱된 적 없음'
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const getSitemapTypeLabel = (type: string) => {
    const found = SITEMAP_TYPES.find(t => t.value === type)
    return found ? found.label : type
  }

  const getIndexingModeLabel = (mode: string) => {
    const found = INDEXING_MODES.find(m => m.value === mode)
    return found ? found.label : mode
  }

  const getIndexingConfigDescription = () => {
    switch (indexingConfig.mode) {
      case 'recentCount':
        return `최근 ${indexingConfig.count || 50}개 글 색인`
      case 'recentDays':
        return `최근 ${indexingConfig.days || 7}일 이내 글 색인`
      case 'fromDate':
        return `${indexingConfig.startDate || '날짜 미설정'} 이후 글 색인`
      case 'all':
        return '전체 글 색인'
      default:
        return '설정되지 않음'
    }
  }

  if (loading && configs.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <LoadingOutlined style={{ fontSize: '24px' }} />
          <div style={{ marginTop: '8px' }}>로딩 중...</div>
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* 색인 기준 설정 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>색인 기준 설정</span>
          </Space>
        }
        style={{ marginBottom: '16px' }}
        extra={
          <Button type="primary" onClick={() => setIndexingModalVisible(true)}>
            설정 변경
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>현재 설정: </Text>
            <Text>{getIndexingConfigDescription()}</Text>
          </div>
          <Text type="secondary">
            이 설정은 사이트맵에서 색인할 글의 범위를 결정합니다. 블로그에 글이 많은 경우 최근 글만 색인하는 것을
            권장합니다.
          </Text>
        </Space>
      </Card>

      {/* 사이트맵 설정 */}
      <Card
        title={
          <Space>
            <GlobalOutlined />
            <span>사이트맵 설정</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleManualParse}
              loading={parsing}
              disabled={configs.length === 0}
            >
              수동 파싱
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddConfig}>
              사이트맵 추가
            </Button>
          </Space>
        }
      >
        {error && <Alert message="오류" description={error} type="error" showIcon style={{ marginBottom: '16px' }} />}

        {success && (
          <Alert message="성공" description={success} type="success" showIcon style={{ marginBottom: '16px' }} />
        )}

        {configs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <GlobalOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>등록된 사이트맵이 없습니다.</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>사이트맵을 추가하여 자동 색인을 설정하세요.</div>
          </div>
        ) : (
          <List
            dataSource={configs}
            renderItem={config => (
              <List.Item
                actions={[
                  <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => handleEditConfig(config)} />,
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteConfig(config.id)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{config.name}</Text>
                      <Tag color="blue">{getSitemapTypeLabel(config.sitemapType)}</Tag>
                      {config.isEnabled ? <Tag color="green">활성</Tag> : <Tag color="default">비활성</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Space>
                        <CalendarOutlined />
                        <Text type="secondary">마지막 파싱: {formatLastParsed(config.lastParsed)}</Text>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 사이트맵 설정 모달 */}
      <Modal
        title={editingConfig ? '사이트맵 수정' : '사이트맵 추가'}
        open={modalVisible}
        onOk={form.submit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
          <Form.Item
            name="name"
            label="사이트맵 이름"
            rules={[{ required: true, message: '사이트맵 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 메인 사이트맵, 블로그 사이트맵" />
          </Form.Item>
          <Form.Item
            name="sitemapType"
            label="사이트맵 타입"
            rules={[{ required: true, message: '사이트맵 타입을 선택해주세요' }]}
          >
            <Select placeholder="사이트맵 타입을 선택하세요">
              {SITEMAP_TYPES.map(type => (
                <Option key={type.value} value={type.value} disabled={type.disabled}>
                  <div>
                    <div>{type.label}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{type.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isEnabled" label="활성화" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 색인 기준 설정 모달 */}
      <Modal
        title="색인 기준 설정"
        open={indexingModalVisible}
        onOk={indexingForm.submit}
        onCancel={() => setIndexingModalVisible(false)}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={indexingForm}
          layout="vertical"
          onFinish={handleSaveIndexingConfig}
          initialValues={{
            mode: indexingConfig.mode,
            count: indexingConfig.count,
            days: indexingConfig.days,
            startDate: indexingConfig.startDate ? dayjs(indexingConfig.startDate) : undefined,
          }}
        >
          <Form.Item name="mode" label="색인 모드" rules={[{ required: true, message: '색인 모드를 선택해주세요' }]}>
            <Select placeholder="색인 모드를 선택하세요">
              {INDEXING_MODES.map(mode => (
                <Option key={mode.value} value={mode.value}>
                  <div>
                    <div>{mode.label}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{mode.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.mode !== currentValues.mode}>
            {({ getFieldValue }) => {
              const mode = getFieldValue('mode')

              return (
                <>
                  {mode === 'recentCount' && (
                    <Form.Item
                      name="count"
                      label="색인할 글 개수"
                      rules={[{ required: true, message: '개수를 입력해주세요' }]}
                    >
                      <Input type="number" min={1} max={1000} placeholder="예: 50" />
                    </Form.Item>
                  )}

                  {mode === 'recentDays' && (
                    <Form.Item
                      name="days"
                      label="색인할 기간 (일)"
                      rules={[{ required: true, message: '일수를 입력해주세요' }]}
                    >
                      <Input type="number" min={1} max={365} placeholder="예: 7" />
                    </Form.Item>
                  )}

                  {mode === 'fromDate' && (
                    <Form.Item
                      name="startDate"
                      label="시작 날짜"
                      rules={[{ required: true, message: '시작 날짜를 선택해주세요' }]}
                    >
                      <DatePicker style={{ width: '100%' }} placeholder="시작 날짜를 선택하세요" />
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

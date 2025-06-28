import { Button, Divider, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import React from 'react'

const { Text } = Typography
const { Option } = Select

export interface DetailedResult {
  id: string
  service: string
  url: string
  status: 'success' | 'failed' | 'running'
  message: string
  rawData: any
}

interface Props {
  visible: boolean
  onClose: () => void
  selectedTask: any
  detailedResults: DetailedResult[]
  filters: { status: string; services: string[] }
  setFilters: (f: { status: string; services: string[] }) => void
  selectedRowKeys: React.Key[]
  setSelectedRowKeys: (keys: React.Key[]) => void
  handleReRequest: (isSingle: boolean, record?: DetailedResult) => void
  filteredDetailedResults: DetailedResult[]
  getExecutionTime: (task: any) => string
}

const IndexingDetailModal: React.FC<Props> = ({
  visible,
  onClose,
  selectedTask,
  detailedResults,
  filters,
  setFilters,
  selectedRowKeys,
  setSelectedRowKeys,
  handleReRequest,
  filteredDetailedResults,
  getExecutionTime,
}) => {
  const detailedResultColumns = [
    {
      title: '엔진',
      dataIndex: 'service',
      key: 'service',
      width: 120,
      render: (service: string) => <span>{service.charAt(0).toUpperCase() + service.slice(1)}</span>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <Text style={{ maxWidth: 400 }} ellipsis={{ tooltip: url }} copyable>
          {url}
        </Text>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        status === 'success' ? (
          <Tag color="success">성공</Tag>
        ) : status === 'failed' ? (
          <Tag color="error">실패</Tag>
        ) : (
          <Tag color="processing">진행중</Tag>
        ),
    },
    {
      title: '결과 메시지',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string, record: DetailedResult) => {
        // rawData에서 상세 정보 추출
        const rawData = record.rawData
        const detailedInfo = []

        // 1. 다음(Daum)에서 추출한 에러 메시지 표시 (새로운 구조)
        if (rawData?.extractedFromDesc && rawData?.originalErrorFromDesc) {
          detailedInfo.push(`[HTML에서 추출된 상세 메시지]`)
          detailedInfo.push(rawData.originalErrorFromDesc)
          detailedInfo.push('')
        }

        // 2. 서버 응답의 failedUrls에서 상세 에러 메시지 추출
        if (rawData?.details?.additionalInfo?.failedUrls) {
          const failedUrls = rawData.details.additionalInfo.failedUrls
          if (failedUrls.length > 0) {
            detailedInfo.push('[서버에서 추출된 상세 에러]')
            failedUrls.forEach((failedUrl: any, index: number) => {
              detailedInfo.push(`${index + 1}. URL: ${failedUrl.url}`)
              detailedInfo.push(`   에러: ${failedUrl.error}`)
              detailedInfo.push(`   상태: ${failedUrl.status}`)
            })
            detailedInfo.push('')
          }
        }

        // 3. 서버 응답의 results에서 추가 정보 추출
        if (rawData?.data.details?.additionalInfo?.results) {
          const results = rawData.data.details.additionalInfo.results
          if (results.length > 0) {
            detailedInfo.push('[실행 결과 상세]')
            results.forEach((result: any, index: number) => {
              detailedInfo.push(`${index + 1}. URL: ${result.url}`)
              detailedInfo.push(`   상태: ${result.status}`)
              detailedInfo.push(`   메시지: ${result.msg}`)
            })
            detailedInfo.push('')
          }
        }

        // 4. 기타 상세 정보가 있는 경우 추가
        if (rawData && typeof rawData === 'object') {
          const additionalInfo = []

          // 응답 데이터가 있는 경우
          if (rawData.responseData) {
            additionalInfo.push(`응답 데이터: ${JSON.stringify(rawData.responseData, null, 2)}`)
          }

          // 에러 상세 정보가 있는 경우
          if (rawData.errorDetails) {
            additionalInfo.push(`에러 상세: ${rawData.errorDetails}`)
          }

          // 서비스 및 작업 정보
          if (rawData.service && rawData.operation) {
            additionalInfo.push(`서비스: ${rawData.service}`)
            additionalInfo.push(`작업: ${rawData.operation}`)
          }

          if (additionalInfo.length > 0) {
            detailedInfo.push('[시스템 정보]')
            detailedInfo.push(...additionalInfo)
          }
        }

        const hasDetailedInfo = detailedInfo.length > 0

        const tooltipContent = hasDetailedInfo ? (
          <div style={{ maxWidth: 400 }}>
            <div>
              <strong>기본 메시지:</strong>
            </div>
            <div style={{ marginBottom: 12 }}>{msg}</div>
            {detailedInfo.map((line, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 4,
                  fontWeight: line.startsWith('[') && line.endsWith(']') ? 'bold' : 'normal',
                  color: line.startsWith('[') && line.endsWith(']') ? '#1890ff' : 'inherit',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : (
          msg
        )

        return (
          <Tooltip title={tooltipContent} overlayStyle={{ maxWidth: 500 }}>
            <div style={{ maxWidth: 300 }}>
              <Text ellipsis>{msg}</Text>
              {hasDetailedInfo && (
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  상세 정보 있음 (마우스 오버로 확인)
                </Text>
              )}
            </div>
          </Tooltip>
        )
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      render: (_: any, record: DetailedResult) =>
        record.status === 'failed' ? (
          <Button size="small" onClick={() => handleReRequest(true, record)}>
            재시도
          </Button>
        ) : null,
    },
  ]

  return (
    <Modal
      title="인덱싱 작업 상세 결과"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
      ]}
      width="90vw"
      style={{ top: 20 }}
    >
      {selectedTask && (
        <div>
          <p>
            <strong>사이트:</strong> {selectedTask.siteUrl}
          </p>
          <p>
            <strong>실행 시간:</strong> {new Date(selectedTask.startTime).toLocaleString()}
          </p>
          <p>
            <strong>총 소요 시간:</strong> {getExecutionTime(selectedTask)}
          </p>
          <Divider />
          <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Select
                value={filters.status}
                onChange={value => setFilters({ ...filters, status: value })}
                style={{ width: 120 }}
              >
                <Option value="all">전체 상태</Option>
                <Option value="success">성공</Option>
                <Option value="failed">실패</Option>
              </Select>
              <Select
                mode="multiple"
                placeholder="서비스 필터"
                value={filters.services}
                onChange={value => setFilters({ ...filters, services: value })}
                style={{ minWidth: 200 }}
                allowClear
              >
                {selectedTask.services.map((s: string) => (
                  <Option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Option>
                ))}
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
  )
}

export default IndexingDetailModal

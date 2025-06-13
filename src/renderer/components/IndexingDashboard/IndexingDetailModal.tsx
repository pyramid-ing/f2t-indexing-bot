import React from 'react'
import { Modal, Table, Button, Divider, Space, Select, Tag, Typography } from 'antd'

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
      render: (msg: string) => (
        <Text style={{ maxWidth: 300 }} ellipsis={{ tooltip: msg }}>
          {msg}
        </Text>
      ),
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

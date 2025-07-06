import React from 'react'
import { Table, Button, Space, Tag } from 'antd'
import { Job, JobStatus } from '@render/api/job/jobApi'

interface IndexingTaskTableProps {
  tasks: Job[]
  loading: boolean
  onTaskSelect: (task: Job) => void
  onTaskRetry: (taskId: string) => void
  onTaskDelete: (taskId: string) => void
}

export const IndexingTaskTable: React.FC<IndexingTaskTableProps> = ({
  tasks,
  loading,
  onTaskSelect,
  onTaskRetry,
  onTaskDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case JobStatus.COMPLETED:
        return 'success'
      case JobStatus.FAILED:
        return 'error'
      case JobStatus.IN_PROGRESS:
        return 'processing'
      case JobStatus.CANCELLED:
        return 'default'
      default:
        return 'warning'
    }
  }

  const columns = [
    {
      title: '사이트',
      dataIndex: 'siteName',
      key: 'siteName',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: '예약일',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '시작일',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: '완료일',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: Job) => (
        <Space size="middle">
          <Button type="link" onClick={() => onTaskSelect(record)}>
            상세
          </Button>
          {record.status === JobStatus.FAILED && (
            <Button type="link" onClick={() => onTaskRetry(record.id)}>
              재시도
            </Button>
          )}
          <Button type="link" danger onClick={() => onTaskDelete(record.id)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ]

  return <Table columns={columns} dataSource={tasks} loading={loading} rowKey="id" />
}

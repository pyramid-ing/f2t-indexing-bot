import type { JSX } from 'react'
import type { IndexingTask } from './useIndexingTasks'
import { EyeOutlined } from '@ant-design/icons'
import { Button, Table, Tag } from 'antd'
import React from 'react'

interface Props {
  tasks: IndexingTask[]
  loading: boolean
  onShowDetail: (task: IndexingTask) => void
}

const IndexingTaskTable: React.FC<Props> = ({ tasks, loading, onShowDetail }) => {
  const columns = [
    {
      title: '실행 시간',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (st: number) => new Date(st).toLocaleString(),
    },
    { title: '사이트', dataIndex: 'siteUrl', key: 'siteUrl' },
    { title: 'URL 수', dataIndex: 'urls', key: 'urlCount', render: (urls: string[]) => `${urls.length}개` },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const tagMap: { [key: string]: JSX.Element } = {
          running: <Tag color="processing">실행중</Tag>,
          completed: <Tag color="success">완료</Tag>,
          failed: <Tag color="error">실패</Tag>,
          pending: <Tag>대기중</Tag>,
        }
        return tagMap[status] || <Tag>알 수 없음</Tag>
      },
    },
    {
      title: '소요 시간',
      key: 'duration',
      render: (_: any, record: IndexingTask) => {
        if (!record.endTime)
          return '-'
        const duration = record.endTime - record.startTime
        return `${(duration / 1000).toFixed(2)}초`
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: IndexingTask) => (
        <Button onClick={() => onShowDetail(record)} icon={<EyeOutlined />}>
          상세 보기
        </Button>
      ),
    },
  ]
  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{ pageSize: 10 }}
    />
  )
}

export default IndexingTaskTable

import React, { useCallback, useEffect, useState } from 'react'
import { Button, Table, Tag, Space, Checkbox, Popconfirm, message } from 'antd'
import { ReloadOutlined, DeleteOutlined, RedoOutlined } from '@ant-design/icons'
import { Job, JobStatus, deleteJobs, getJobs, retryJobs } from '../../api'
import { format } from 'date-fns'
import styled from 'styled-components'

const TableContainer = styled.div`
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`

const ToolbarContainer = styled.div`
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const StatusTag = styled(Tag)<{ $status: JobStatus }>`
  min-width: 70px;
  text-align: center;

  ${props => {
    switch (props.$status) {
      case JobStatus.COMPLETED:
        return 'background: #f6ffed; color: #52c41a; border-color: #b7eb8f;'
      case JobStatus.FAILED:
        return 'background: #fff2f0; color: #ff4d4f; border-color: #ffccc7;'
      case JobStatus.PROCESSING:
        return 'background: #e6f7ff; color: #1890ff; border-color: #91d5ff;'
      default:
        return 'background: #f5f5f5; color: #595959; border-color: #d9d9d9;'
    }
  }}
`

export default function ScheduledPostsTable() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getJobs({
        orderBy: 'scheduledAt',
        order: 'desc',
      })
      setJobs(data)
    } catch (error) {
      message.error('작업 목록 로딩 실패')
      console.error('작업 목록 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    const timer = setInterval(loadJobs, 5000)
    return () => clearInterval(timer)
  }, [loadJobs])

  const handleRetry = async () => {
    if (!selectedJobs.length) return
    try {
      await retryJobs(selectedJobs)
      message.success('선택한 작업 재시도 요청 완료')
      await loadJobs()
      setSelectedJobs([])
    } catch (error) {
      message.error('작업 재시도 실패')
      console.error('작업 재시도 실패:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedJobs.length) return
    try {
      await deleteJobs(selectedJobs)
      message.success('선택한 작업 삭제 완료')
      await loadJobs()
      setSelectedJobs([])
    } catch (error) {
      message.error('작업 삭제 실패')
      console.error('작업 삭제 실패:', error)
    }
  }

  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={selectedJobs.length > 0 && selectedJobs.length < jobs.length}
          checked={jobs.length > 0 && selectedJobs.length === jobs.length}
          onChange={e => (e.target.checked ? setSelectedJobs(jobs.map(j => j.id)) : setSelectedJobs([]))}
        />
      ),
      dataIndex: 'id',
      width: 50,
      render: (id: string) => (
        <Checkbox
          checked={selectedJobs.includes(id)}
          onChange={e => {
            if (e.target.checked) {
              setSelectedJobs([...selectedJobs, id])
            } else {
              setSelectedJobs(selectedJobs.filter(jobId => jobId !== id))
            }
          }}
        />
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 100,
      render: (status: JobStatus) => <StatusTag $status={status}>{status}</StatusTag>,
    },
    {
      title: '제목',
      dataIndex: 'subject',
      ellipsis: true,
    },
    {
      title: '설명',
      dataIndex: 'desc',
      ellipsis: true,
    },
    {
      title: '예약 시간',
      dataIndex: 'scheduledAt',
      width: 180,
      render: (date: string) => format(new Date(date), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      title: '완료 시간',
      dataIndex: 'completedAt',
      width: 180,
      render: (date: string) => (date ? format(new Date(date), 'yyyy-MM-dd HH:mm:ss') : '-'),
    },
    {
      title: '결과',
      dataIndex: 'resultMsg',
      ellipsis: true,
      render: (msg: string, record: Job) => msg || record.errorMessage || '-',
    },
  ]

  return (
    <TableContainer>
      <ToolbarContainer>
        <Space>
          <Button type="primary" icon={<RedoOutlined />} onClick={handleRetry} disabled={!selectedJobs.length}>
            선택 작업 재시도
          </Button>
          <Popconfirm title="선택한 작업을 삭제하시겠습니까?" onConfirm={handleDelete} okText="삭제" cancelText="취소">
            <Button danger icon={<DeleteOutlined />} disabled={!selectedJobs.length}>
              선택 작업 삭제
            </Button>
          </Popconfirm>
          <Button icon={<ReloadOutlined />} onClick={loadJobs} loading={loading} />
        </Space>
        {selectedJobs.length > 0 && <span style={{ color: '#8c8c8c' }}>{selectedJobs.length}개 작업 선택됨</span>}
      </ToolbarContainer>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={jobs}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `총 ${total}개`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </TableContainer>
  )
}

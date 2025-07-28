import React, { useState } from 'react'
import { useIndexingTasks } from '@render/features/dashboard'
import { message, Input, Button, Space } from 'antd'
import { createIndexJob } from '@render/api/jobApi'
import JobTable from '@render/features/work-management/JobTable'

export const IndexingDashboard: React.FC = () => {
  const { tasks, loading, selectedTask, onTaskSelect, onTaskClose, onTaskRetry, onTaskDelete, refresh } =
    useIndexingTasks()
  const [urlInput, setUrlInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUrlInput(e.target.value)
  }

  const handleSubmit = async () => {
    const urls = urlInput
      .split(/\r?\n/)
      .map(url => url.trim())
      .filter(Boolean)
    if (urls.length === 0) {
      message.warning('URL을 한 개 이상 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      for (const url of urls) {
        await createIndexJob({ url })
      }
      message.success('인덱싱 요청이 등록되었습니다.')
      setUrlInput('')
      refresh()
    } catch (err: any) {
      message.error('인덱싱 요청 중 오류가 발생했습니다: ' + (err?.message || ''))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestIndexing = async (task: any) => {
    try {
      await createIndexJob({ url: task.url })
      message.success('인덱싱 요청이 재등록되었습니다.')
      refresh()
    } catch (err: any) {
      message.error('인덱싱 요청 중 오류가 발생했습니다: ' + (err?.message || ''))
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">인덱싱 대시보드</h1>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Input.TextArea
          rows={4}
          value={urlInput}
          onChange={handleUrlInputChange}
          placeholder="여러 개의 URL을 줄 단위로 입력하세요."
        />
        <Button type="primary" onClick={handleSubmit} loading={submitting}>
          인덱싱 요청
        </Button>
      </Space>
      <JobTable></JobTable>
    </div>
  )
}

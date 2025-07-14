import { useState, useEffect } from 'react'
import { jobApi, Job, JobStatus } from '@render/api/job/jobApi'

export interface IndexingTask {
  id: string
  siteId: string
  siteName: string
  provider: string
  url: string
  status: string
  createdAt: string
  scheduledAt: string
  completedAt?: string
  errorMessage?: string
  resultMessage?: string
}

// IndexingTask → Job 변환 함수
type ToJob = (task: IndexingTask) => Job
const toJob: ToJob = task => ({
  id: task.id,
  siteId: task.siteId,
  siteName: task.siteName,
  provider: task.provider,
  url: task.url,
  status: task.status as JobStatus, // 실제 값이 JobStatus와 일치한다고 가정
  createdAt: task.createdAt,
  scheduledAt: task.scheduledAt,
  startedAt: undefined,
  completedAt: task.completedAt,
  errorMsg: task.errorMessage,
  resultMsg: task.resultMessage,
})

export const useIndexingTasks = () => {
  const [tasks, setTasks] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Job | null>(null)

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await jobApi.getAll()
      if (data) {
        setTasks(data?.map(toJob))
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleTaskSelect = (task: Job) => {
    setSelectedTask(task)
  }

  const handleTaskClose = () => {
    setSelectedTask(null)
  }

  const handleTaskRetry = async (taskId: string) => {
    try {
      await jobApi.retry(taskId)
      await loadTasks()
    } catch (error) {
      console.error('Failed to retry task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await jobApi.delete(taskId)
      await loadTasks()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  return {
    tasks,
    loading,
    selectedTask,
    onTaskSelect: handleTaskSelect,
    onTaskClose: handleTaskClose,
    onTaskRetry: handleTaskRetry,
    onTaskDelete: handleTaskDelete,
    refresh: loadTasks,
  }
}

import { useState, useEffect } from 'react'
import { jobApi } from '@render/api/job/jobApi'

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

export const useIndexingTasks = () => {
  const [tasks, setTasks] = useState<IndexingTask[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<IndexingTask | null>(null)

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await jobApi.getAll()
      setTasks(data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleTaskSelect = (task: IndexingTask) => {
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

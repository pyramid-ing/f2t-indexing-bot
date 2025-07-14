import { useState, useEffect } from 'react'
import { getAllJobs, retryJob, deleteJob, Job } from '@render/api/jobApi'

export const useIndexingTasks = () => {
  const [tasks, setTasks] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Job | null>(null)

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await getAllJobs()
      if (data) {
        setTasks(data)
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
      await retryJob(taskId)
      await loadTasks()
    } catch (error) {
      console.error('Failed to retry task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteJob(taskId)
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

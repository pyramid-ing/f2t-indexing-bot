import { useState, useEffect } from 'react'

export interface IndexingTask {
  id: string
  siteUrl: string
  urls: string[]
  services: string[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: Record<string, any>
  startTime: number
  endTime?: number
  _groupedUrls?: Record<string, string[]>
}

export function useIndexingTasks() {
  const [indexingTasks, setIndexingTasks] = useState<IndexingTask[]>(() => {
    try {
      const saved = localStorage.getItem('indexingTasks')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('indexingTasks', JSON.stringify(indexingTasks))
  }, [indexingTasks])

  const addTask = (task: IndexingTask) => {
    setIndexingTasks(prev => [task, ...prev])
  }

  const updateTask = (id: string, updater: (task: IndexingTask) => IndexingTask) => {
    setIndexingTasks(prev => prev.map(t => (t.id === id ? updater(t) : t)))
  }

  return {
    indexingTasks,
    setIndexingTasks,
    addTask,
    updateTask,
  }
}

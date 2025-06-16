import React from 'react'
import IndexingDashboard from '../components/IndexingDashboard/IndexingDashboard'
import { useIndexingTasks } from '../components/IndexingDashboard/useIndexingTasks'

const IndexingDashboardPage: React.FC = () => {
  const indexingTasksHook = useIndexingTasks()
  return <IndexingDashboard {...indexingTasksHook} />
}

export default IndexingDashboardPage

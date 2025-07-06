import { FC } from 'react'
import { useIndexingTasks } from '../hooks/useIndexingTasks'
import { IndexingTaskTable } from './IndexingTaskTable'
import { IndexingDetailModal } from './IndexingDetailModal'

export const IndexingDashboard: FC = () => {
  const { tasks, loading, selectedTask, onTaskSelect, onTaskClose, onTaskRetry, onTaskDelete } = useIndexingTasks()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">인덱싱 대시보드</h1>
      <IndexingTaskTable
        tasks={tasks}
        loading={loading}
        onTaskSelect={onTaskSelect}
        onTaskRetry={onTaskRetry}
        onTaskDelete={onTaskDelete}
      />
      {selectedTask && <IndexingDetailModal task={selectedTask} onClose={onTaskClose} />}
    </div>
  )
}

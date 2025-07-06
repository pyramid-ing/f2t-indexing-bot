export interface IndexingTask {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  type: string
  createdAt: string
  updatedAt: string
  result?: string
  error?: string
}

export interface IndexingTaskCreate {
  type: string
  // 기타 생성 시 필요한 필드들
}

export interface IndexingTaskUpdate {
  status?: IndexingTask['status']
  result?: string
  error?: string
}

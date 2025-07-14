import React from 'react'
import { Modal, Descriptions } from 'antd'
import { Job } from '@render/api/jobApi'

export interface IndexingDetailModalProps {
  task: Job
  onClose: () => void
}

export const IndexingDetailModal: React.FC<IndexingDetailModalProps> = ({ task, onClose }) => {
  return (
    <Modal title="인덱싱 작업 상세" open={true} onCancel={onClose} footer={null}>
      <Descriptions column={1}>
        <Descriptions.Item label="사이트">{task.siteName}</Descriptions.Item>
        <Descriptions.Item label="URL">{task.url}</Descriptions.Item>
        <Descriptions.Item label="상태">{task.status}</Descriptions.Item>
        <Descriptions.Item label="생성일">{new Date(task.createdAt).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="예약일">{new Date(task.scheduledAt).toLocaleString()}</Descriptions.Item>
        {task.startedAt && (
          <Descriptions.Item label="시작일">{new Date(task.startedAt).toLocaleString()}</Descriptions.Item>
        )}
        {task.completedAt && (
          <Descriptions.Item label="완료일">{new Date(task.completedAt).toLocaleString()}</Descriptions.Item>
        )}
        {task.errorMsg && <Descriptions.Item label="에러 메시지">{task.errorMsg}</Descriptions.Item>}
        {task.resultMsg && <Descriptions.Item label="결과 메시지">{task.resultMsg}</Descriptions.Item>}
      </Descriptions>
    </Modal>
  )
}

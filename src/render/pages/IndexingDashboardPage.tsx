import React from 'react'
import { IndexingDashboard } from '@render/features/dashboard'
import PageContainer from '@render/components/shared/PageContainer'

const IndexingDashboardPage: React.FC = () => {
  return (
    <PageContainer title="인덱싱 대시보드" maxWidth="">
      <IndexingDashboard />
    </PageContainer>
  )
}

export default IndexingDashboardPage

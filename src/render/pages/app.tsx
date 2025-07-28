import React from 'react'
import { Routes, Route } from 'react-router-dom'
import IndexingDashboardPage from './IndexingDashboardPage'
import IndexingSettingsPage from './IndexingSettingsPage'
import Settings from './Settings'
import NaverAccountPage from './NaverAccountPage'
import AppLayout from '../layout/AppLayout'

const App: React.FC = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<IndexingDashboardPage />} />
        <Route path="/indexing-settings" element={<IndexingSettingsPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/naver-accounts" element={<NaverAccountPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App

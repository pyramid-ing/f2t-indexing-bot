import React from 'react'
import { Routes, Route } from 'react-router-dom'
import IndexingDashboardPage from './IndexingDashboardPage'
import Settings from './Settings'
import NaverAccountPage from './NaverAccountPage'
import Sidebar from '@render/layout/Sidebar'

const App: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<IndexingDashboardPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/naver-accounts" element={<NaverAccountPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default App

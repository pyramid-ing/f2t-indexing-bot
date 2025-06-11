import React, { useState, useEffect } from 'react'
import axios from 'axios'

interface AppStatus {
  initialized: boolean
  setupCompleted: boolean
  firstRun: boolean
  appVersion: string
  error?: string
}

const FirstRunSetup: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState<'welcome' | 'database' | 'completed'>('welcome')

  useEffect(() => {
    checkAppStatus()
  }, [])

  const checkAppStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3000/site-config/app-status')
      const status = response.data as AppStatus
      setAppStatus(status)

      if (status.setupCompleted) {
        setSetupStep('completed')
      } else if (status.initialized) {
        setSetupStep('database')
      }
    } catch (error) {
      console.error('앱 상태 확인 실패:', error)
      setAppStatus({
        initialized: false,
        setupCompleted: false,
        firstRun: true,
        appVersion: '1.0.0',
        error: '상태 확인 실패',
      })
    } finally {
      setLoading(false)
    }
  }

  const completeSetup = async () => {
    try {
      await axios.post('http://localhost:3000/site-config/setup-completed')
      await checkAppStatus()
    } catch (error) {
      console.error('설정 완료 처리 실패:', error)
    }
  }

  const reinitializeDatabase = async () => {
    try {
      setLoading(true)
      await axios.post('http://localhost:3000/site-config/reinitialize-database')
      await checkAppStatus()
    } catch (error) {
      console.error('데이터베이스 재초기화 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">앱 초기화 중...</p>
        </div>
      </div>
    )
  }

  if (!appStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">앱 상태를 확인할 수 없습니다.</p>
          <button onClick={checkAppStatus} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 설정이 완료된 경우 메인 앱으로
  if (appStatus.setupCompleted) {
    return null // 메인 앱 컴포넌트로 전환
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {setupStep === 'welcome' && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">F2T 인덱싱 봇에 오신 것을 환영합니다!</h1>
            <p className="text-gray-600 mb-6">처음 사용하시는군요. 간단한 설정을 통해 시작해보세요.</p>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">데이터베이스가 초기화되었습니다.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSetupStep('database')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                계속하기
              </button>
            </div>
          </div>
        )}

        {setupStep === 'database' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">데이터베이스 설정</h2>
            <p className="text-gray-600 mb-6">
              데이터베이스가 성공적으로 초기화되었습니다. 이제 사이트 설정을 추가할 수 있습니다.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">다음 단계:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 블로그 사이트 추가</li>
                  <li>• 검색엔진 API 키 설정</li>
                  <li>• 인덱싱 URL 관리</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={reinitializeDatabase}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
                >
                  DB 재초기화
                </button>
                <button
                  onClick={completeSetup}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-200"
                >
                  설정 완료
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">버전 {appStatus.appVersion}</p>
        </div>
      </div>
    </div>
  )
}

export default FirstRunSetup

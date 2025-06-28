import type {
  NaverAccount,
  NaverLoginStatus,
} from '../api'
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, LoginOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, List, message, Space, Tag, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import {
  checkNaverLoginComplete,
  checkNaverLoginStatus,
  getAllNaverAccounts,
  openNaverLoginBrowser,
} from '../api'

const { Title, Text } = Typography

export default function NaverLoginList() {
  const [accounts, setAccounts] = useState<NaverAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusMap, setStatusMap] = useState<{ [naverId: string]: NaverLoginStatus }>({})
  const [loadingStatus, setLoadingStatus] = useState<{ [naverId: string]: boolean }>({})
  const [loginActions, setLoginActions] = useState<{ [naverId: string]: boolean }>({})

  // 활성화된 계정 목록 조회
  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const data = await getAllNaverAccounts()
      const activeAccounts = data.filter(account => account.isActive)
      setAccounts(activeAccounts)

      // 각 계정의 로그인 상태 확인
      for (const account of activeAccounts) {
        await checkAccountLoginStatus(account.naverId)
      }
    }
    catch (error) {
      message.error('네이버 계정 목록을 불러오는데 실패했습니다.')
    }
    finally {
      setIsLoading(false)
    }
  }

  // 개별 계정 로그인 상태 확인
  const checkAccountLoginStatus = async (naverId: string) => {
    try {
      setLoadingStatus(prev => ({ ...prev, [naverId]: true }))
      const status = await checkNaverLoginStatus(naverId)
      setStatusMap(prev => ({ ...prev, [naverId]: status }))
    }
    catch (error) {
      console.error(`계정 ${naverId} 로그인 상태 확인 실패:`, error)
    }
    finally {
      setLoadingStatus(prev => ({ ...prev, [naverId]: false }))
    }
  }

  // 개별 로그인 브라우저 열기
  const handleOpenLoginBrowser = async (naverId: string) => {
    try {
      setLoginActions(prev => ({ ...prev, [naverId]: true }))
      const result = await openNaverLoginBrowser(naverId)
      if (result.success) {
        message.success(result.message)
        // 상태 업데이트
        setTimeout(() => checkAccountLoginStatus(naverId), 1000)
      }
      else {
        message.error(result.message)
      }
    }
    catch (error) {
      message.error('로그인 브라우저 열기에 실패했습니다.')
    }
    finally {
      setLoginActions(prev => ({ ...prev, [naverId]: false }))
    }
  }

  // 개별 로그인 완료 확인
  const handleCheckLoginComplete = async (naverId: string) => {
    try {
      setLoginActions(prev => ({ ...prev, [naverId]: true }))
      const result = await checkNaverLoginComplete(naverId)
      if (result.success) {
        message.success(result.message)
        checkAccountLoginStatus(naverId) // 상태 새로고침
      }
      else {
        message.info(result.message)
      }
    }
    catch (error) {
      message.error('로그인 완료 확인에 실패했습니다.')
    }
    finally {
      setLoginActions(prev => ({ ...prev, [naverId]: false }))
    }
  }

  // 새로고침
  const handleRefresh = () => {
    fetchAccounts()
  }

  // 컴포넌트 마운트 시 계정 목록 로드
  useEffect(() => {
    fetchAccounts()
  }, [])

  const getAccountStatusColor = (account: NaverAccount) => {
    return account.isLoggedIn ? 'green' : 'orange'
  }

  const getAccountStatusIcon = (account: NaverAccount) => {
    return account.isLoggedIn ? <CheckCircleOutlined /> : <CloseCircleOutlined />
  }

  const getAccountStatusText = (account: NaverAccount) => {
    return account.isLoggedIn ? '로그인됨' : '로그인 필요'
  }

  return (
    <Card
      title={(
        <Space>
          <UserOutlined style={{ color: '#03c75a' }} />
          <Title level={5} style={{ margin: 0 }}>네이버 로그인 관리</Title>
        </Space>
      )}
      extra={(
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={isLoading}
        >
          새로고침
        </Button>
      )}
      style={{ marginBottom: 16 }}
    >
      {accounts.length > 0
        ? (
            <List
              size="small"
              dataSource={accounts}
              renderItem={(account) => {
                const status = statusMap[account.naverId]
                const isLoadingThisStatus = loadingStatus[account.naverId]
                const isLoginAction = loginActions[account.naverId]

                return (
                  <List.Item
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 6,
                      marginBottom: 8,
                      backgroundColor: account.isLoggedIn ? '#f6ffed' : '#fafafa',
                    }}
                  >
                    <List.Item.Meta
                      avatar={(
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {isLoadingThisStatus ? <LoadingOutlined /> : getAccountStatusIcon(account)}
                        </div>
                      )}
                      title={(
                        <Space>
                          <Text strong>{account.name}</Text>
                          <Text type="secondary">
                            (
                            {account.naverId}
                            )
                          </Text>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <Tag color={getAccountStatusColor(account)}>
                              {getAccountStatusText(account)}
                            </Tag>
                            {account.lastLogin && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                마지막 로그인:
                                {' '}
                                {new Date(account.lastLogin).toLocaleString('ko-KR')}
                              </Text>
                            )}
                          </Space>
                          <Space>
                            <Button
                              size="small"
                              type="primary"
                              icon={<LoginOutlined />}
                              onClick={() => handleOpenLoginBrowser(account.naverId)}
                              loading={isLoginAction}
                              disabled={isLoadingThisStatus}
                            >
                              로그인하기
                            </Button>
                            <Button
                              size="small"
                              onClick={() => handleCheckLoginComplete(account.naverId)}
                              loading={isLoginAction}
                              disabled={isLoadingThisStatus}
                            >
                              완료 확인
                            </Button>
                            <Button
                              size="small"
                              onClick={() => checkAccountLoginStatus(account.naverId)}
                              loading={isLoadingThisStatus}
                              disabled={isLoginAction}
                            >
                              상태 확인
                            </Button>
                          </Space>
                        </Space>
                      )}
                    />
                  </List.Item>
                )
              }}
            />
          )
        : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
              <Text>등록된 네이버 계정이 없습니다.</Text>
              <br />
              <Text type="secondary">설정 페이지에서 네이버 계정을 등록해주세요.</Text>
            </div>
          )}
    </Card>
  )
}

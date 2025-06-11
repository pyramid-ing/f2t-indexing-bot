import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Space, Avatar, Typography, message, Spin, Modal } from 'antd'
import { GoogleOutlined, DisconnectOutlined, UserOutlined } from '@ant-design/icons'
import {
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  isGoogleLoggedIn,
  getValidAccessToken,
  getGoogleUserInfo,
  clearGoogleTokens,
  saveGoogleTokens,
} from '../utils/googleAuth'

const { Text, Title } = Typography

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

const GoogleAccountSettings: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [authModalVisible, setAuthModalVisible] = useState(false)
  const [authCode, setAuthCode] = useState('')

  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    setLoading(true)
    try {
      const loggedIn = isGoogleLoggedIn()
      setIsLoggedIn(loggedIn)

      if (loggedIn && clientSecret) {
        const accessToken = await getValidAccessToken(clientSecret)
        if (accessToken) {
          const user = await getGoogleUserInfo(accessToken)
          setUserInfo(user)
        } else {
          setIsLoggedIn(false)
          setUserInfo(null)
        }
      }
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error)
      setIsLoggedIn(false)
      setUserInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    if (!clientSecret.trim()) {
      message.error('Client Secret을 먼저 입력해주세요.')
      return
    }

    const authUrl = generateGoogleAuthUrl()

    // Electron에서 외부 브라우저로 열기
    if ((window as any).electron?.shell?.openExternal) {
      ;(window as any).electron.shell.openExternal(authUrl)
    } else {
      window.open(authUrl, '_blank')
    }

    setAuthModalVisible(true)
    message.info('브라우저에서 Google 로그인을 완료하면 인증 코드가 표시됩니다. 코드를 복사해서 입력해주세요.')
  }

    const handleAuthCodeSubmit = async () => {
    if (!authCode.trim()) {
      message.error('인증 코드를 입력해주세요.')
      return
    }

    if (!clientSecret.trim()) {
      message.error('Client Secret을 먼저 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      console.log('인증 코드 제출:', {
        authCodeLength: authCode.length,
        clientSecretLength: clientSecret.length,
      })

      const tokens = await exchangeCodeForTokens(authCode.trim(), clientSecret.trim())
      saveGoogleTokens(tokens)
      
      const user = await getGoogleUserInfo(tokens.accessToken)
      setUserInfo(user)
      setIsLoggedIn(true)
      setAuthModalVisible(false)
      setAuthCode('')
      
      message.success(`Google 계정 연동이 완료되었습니다. (${user.email})`)
    } catch (error: any) {
      console.error('Google 로그인 오류:', error)
      message.error(error.message || 'Google 로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearGoogleTokens()
    setIsLoggedIn(false)
    setUserInfo(null)
    message.success('Google 계정 연동이 해제되었습니다.')
  }

  const testBloggerAPI = async () => {
    if (!clientSecret.trim()) {
      message.error('Client Secret을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const accessToken = await getValidAccessToken(clientSecret)
      if (!accessToken) {
        message.error('유효한 액세스 토큰이 없습니다. 다시 로그인해주세요.')
        return
      }

      // 사용자 블로그 목록 조회 테스트
      const response = await fetch(`http://localhost:3030/google-blogger/user/blogs?accessToken=${accessToken}`)
      const result = await response.json()

      if (response.ok) {
        const blogCount = result.blogs?.items?.length || 0
        message.success(`Blogger API 테스트 성공! 블로그 ${blogCount}개 발견`)
        console.log('블로그 목록:', result.blogs)
      } else {
        message.error('Blogger API 테스트 실패: ' + (result.message || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Blogger API 테스트 오류:', error)
      message.error('Blogger API 테스트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Google 계정 설정" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Client Secret 입력 */}
        <div>
          <Text strong>Google Client Secret:</Text>
          <Input.Password
            placeholder="Google OAuth2 Client Secret을 입력하세요"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Google Cloud Console에서 OAuth2 Client Secret을 확인할 수 있습니다.
          </Text>
        </div>

        {/* 로그인 상태 */}
        <div>
          <Title level={5}>연동 상태</Title>
          {loading ? (
            <Spin size="small" />
          ) : isLoggedIn && userInfo ? (
            <Space>
              <Avatar src={userInfo.picture} icon={<UserOutlined />} size={32} />
              <div>
                <Text strong>{userInfo.name}</Text>
                <br />
                <Text type="secondary">{userInfo.email}</Text>
              </div>
              <Button type="link" danger icon={<DisconnectOutlined />} onClick={handleLogout}>
                연동 해제
              </Button>
            </Space>
          ) : (
            <Space>
              <Text type="secondary">Google 계정이 연동되지 않았습니다.</Text>
              <Button
                type="primary"
                icon={<GoogleOutlined />}
                onClick={handleGoogleLogin}
                disabled={!clientSecret.trim()}
              >
                Google 계정 연동
              </Button>
            </Space>
          )}
        </div>

        {/* API 테스트 */}
        {isLoggedIn && (
          <div>
            <Button type="default" onClick={testBloggerAPI} loading={loading}>
              Blogger API 테스트
            </Button>
          </div>
        )}
      </Space>

      {/* 인증 코드 입력 모달 */}
      <Modal
        title="Google 인증 코드 입력"
        open={authModalVisible}
        onOk={handleAuthCodeSubmit}
        onCancel={() => {
          setAuthModalVisible(false)
          setAuthCode('')
        }}
        confirmLoading={loading}
        okText="연동하기"
        cancelText="취소"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text>
            브라우저에서 Google 로그인을 완료하시면 인증 코드가 표시됩니다. 해당 코드를 복사해서 입력해주세요.
          </Text>
          <Input
            placeholder="인증 코드 (authorization code)"
            value={authCode}
            onChange={e => setAuthCode(e.target.value)}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            브라우저에서 인증 완료 후 표시되는 코드를 복사해서 입력하세요.
          </Text>
        </Space>
      </Modal>
    </Card>
  )
}

export default GoogleAccountSettings

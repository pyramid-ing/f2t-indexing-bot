import type { NaverAccount, NaverConfig } from '../../api'
import { GlobalOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, message, Select, Switch, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { getAllNaverAccounts } from '../../api'

const { Title, Text } = Typography

interface NaverSettingsProps {
  settings: NaverConfig
  onSave: (values: Partial<NaverConfig>) => Promise<void>
  loading: boolean
}

const NaverSettings: React.FC<NaverSettingsProps> = ({ settings, onSave, loading }) => {
  const [localUse, setLocalUse] = React.useState(settings.use)
  const [selectedAccountId, setSelectedAccountId] = React.useState(settings.selectedNaverAccountId)
  const [accounts, setAccounts] = useState<NaverAccount[]>([])

  // 설정이 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setLocalUse(settings.use)
    setSelectedAccountId(settings.selectedNaverAccountId)
  }, [settings.use, settings.selectedNaverAccountId])

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const data = await getAllNaverAccounts()
      setAccounts(data.filter(account => account.isActive)) // 활성화된 계정만 표시
    }
    catch (error) {
      message.error('네이버 계정 목록을 불러오는데 실패했습니다.')
    }
  }

  const handleSubmit = async () => {
    try {
      if (localUse && !selectedAccountId) {
        message.error('네이버를 사용하려면 계정을 선택해주세요.')
        return
      }

      const finalValues = {
        use: localUse,
        selectedNaverAccountId: localUse ? selectedAccountId : undefined,
      }
      await onSave(finalValues)
      message.success('네이버 설정이 저장되었습니다.')
    }
    catch (error) {
      message.error('네이버 설정 저장에 실패했습니다.')
    }
  }

  const handleUseToggle = (checked: boolean) => {
    setLocalUse(checked)
    // 비활성화할 때 선택 계정도 초기화
    if (!checked) {
      setSelectedAccountId(undefined)
    }
  }

  const selectedAccount = accounts.find(account => account.id === selectedAccountId)

  return (
    <Card
      title={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <GlobalOutlined style={{ color: '#03c75a', marginRight: 8 }} />
            네이버 설정
          </span>
          <Switch
            checked={localUse}
            onChange={handleUseToggle}
            checkedChildren="사용"
            unCheckedChildren="미사용"
            loading={loading}
          />
        </div>
      )}
    >
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          네이버 서치어드바이저를 통해 URL을 네이버 검색엔진에 등록합니다.
        </Text>

        {/* 계정 선택 */}
        <Form layout="vertical">
          <Form.Item
            label="사용할 네이버 계정"
            help={localUse ? '네이버 계정 관리에서 계정을 먼저 추가한 후 선택하세요.' : ''}
            validateStatus={localUse && !selectedAccountId ? 'error' : ''}
          >
            <Select
              placeholder="네이버 계정을 선택하세요"
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              disabled={!localUse}
              style={{ width: '100%' }}
              allowClear
            >
              {accounts.map(account => (
                <Select.Option key={account.id} value={account.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <strong>{account.name}</strong>
                      {' '}
                      (
                      {account.naverId}
                      )
                    </span>
                    <span style={{
                      color: account.isLoggedIn ? '#52c41a' : '#ff4d4f',
                      fontSize: '12px',
                    }}
                    >
                      {account.isLoggedIn ? '로그인됨' : '로그인 필요'}
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedAccount && (
            <div
              style={{
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text strong style={{ color: '#389e0d' }}>
                <UserOutlined style={{ marginRight: 8 }} />
                선택된 계정:
                {' '}
                {selectedAccount.name}
                {' '}
                (
                {selectedAccount.naverId}
                )
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                로그인 상태:
                {' '}
                {selectedAccount.isLoggedIn ? '로그인됨' : '로그인 필요'}
                                 {selectedAccount.lastLogin && ` | 마지막 상태확인: ${new Date(selectedAccount.lastLogin).toLocaleString('ko-KR')}`}
              </Text>
            </div>
          )}
        </Form>

        <div
          style={{
            backgroundColor: '#fff7e6',
            border: '1px solid #ffd666',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text strong style={{ color: '#d48806' }}>
            📊 네이버 등록 제한사항
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              • 하루 최대 50개 URL 등록 가능
              <br />
              • 크롤링 방식으로 실패하는 경우가 종종 있습니다. 이 경우 확인해서 재등록이 필요합니다
              <br />
              • 주기적으로 수동 로그인이 필요합니다 (자동 로그인 제한)
            </Text>
          </div>
        </div>
      </div>

      <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading} size="large">
        네이버 설정 저장
      </Button>

      {!localUse && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, color: '#faad14' }}>
            위의 스위치를 켜고 계정을 선택한 후 저장해주세요.
          </Text>
        </div>
      )}

      {accounts.length === 0 && localUse && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, color: '#ff4d4f' }}>
            사용 가능한 네이버 계정이 없습니다. "네이버 계정 관리"에서 계정을 먼저 추가해주세요.
          </Text>
        </div>
      )}
    </Card>
  )
}

export default NaverSettings

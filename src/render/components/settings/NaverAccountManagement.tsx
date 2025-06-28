import type { NaverAccount } from '../../api'
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, message, Modal, Popconfirm, Space, Switch, Table, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { createNaverAccount, deleteNaverAccount, getAllNaverAccounts, updateNaverAccount } from '../../api'

const { Title, Text } = Typography

const NaverAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<NaverAccount[]>([])
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<NaverAccount | null>(null)
  const [accountForm] = Form.useForm()
  const [accountLoading, setAccountLoading] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const data = await getAllNaverAccounts()
      setAccounts(data)
    } catch (error) {
      message.error('네이버 계정 목록을 불러오는데 실패했습니다.')
    }
  }

  // 계정 모달 열기 (생성)
  const handleAddAccount = () => {
    setEditingAccount(null)
    accountForm.resetFields()
    setIsAccountModalOpen(true)
  }

  // 계정 모달 열기 (수정)
  const handleEditAccount = (account: NaverAccount) => {
    setEditingAccount(account)
    accountForm.setFieldsValue({
      name: account.name,
      naverId: account.naverId,
      password: account.password,
      isActive: account.isActive,
    })
    setIsAccountModalOpen(true)
  }

  // 계정 저장
  const handleSaveAccount = async () => {
    try {
      setAccountLoading(true)
      const values = await accountForm.validateFields()

      if (editingAccount) {
        // 수정
        await updateNaverAccount(editingAccount.id, values)
        message.success('네이버 계정이 수정되었습니다.')
      } else {
        // 생성
        await createNaverAccount(values)
        message.success('네이버 계정이 생성되었습니다.')
      }

      setIsAccountModalOpen(false)
      fetchAccounts()
    } catch (error) {
      console.error('네이버 계정 저장 실패:', error)
      message.error('네이버 계정 저장에 실패했습니다.')
    } finally {
      setAccountLoading(false)
    }
  }

  // 계정 삭제
  const handleDeleteAccount = async (accountId: number) => {
    try {
      await deleteNaverAccount(accountId)
      message.success('네이버 계정이 삭제되었습니다.')
      fetchAccounts()
    } catch (error) {
      console.error('네이버 계정 삭제 실패:', error)
      message.error('네이버 계정 삭제에 실패했습니다.')
    }
  }

  const accountColumns = [
    {
      title: '계정명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '네이버 아이디',
      dataIndex: 'naverId',
      key: 'naverId',
    },
    {
      title: '활성화',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>{isActive ? '활성' : '비활성'}</span>
      ),
    },
    {
      title: '로그인 상태',
      dataIndex: 'isLoggedIn',
      key: 'isLoggedIn',
      render: (isLoggedIn: boolean) => (
        <span style={{ color: isLoggedIn ? '#52c41a' : '#ff4d4f' }}>{isLoggedIn ? '로그인됨' : '로그인 필요'}</span>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: NaverAccount) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditAccount(record)}>
            수정
          </Button>
          <Popconfirm
            title="계정을 삭제하시겠습니까?"
            description="이 작업은 되돌릴 수 없습니다."
            onConfirm={() => handleDeleteAccount(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button size="small" icon={<DeleteOutlined />} danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <UserOutlined style={{ color: '#03c75a', marginRight: 8 }} />
              네이버 계정 관리
            </span>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
              계정 추가
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            네이버 서치어드바이저에 사용할 계정들을 관리합니다. 각 사이트별 설정에서 이 계정들 중 하나를 선택하여 사용할
            수 있습니다.
          </Text>
        </div>

        <Table columns={accountColumns} dataSource={accounts} rowKey="id" size="small" pagination={false} />
      </Card>

      {/* 계정 생성/수정 모달 */}
      <Modal
        title={editingAccount ? '네이버 계정 수정' : '네이버 계정 추가'}
        open={isAccountModalOpen}
        onOk={handleSaveAccount}
        onCancel={() => setIsAccountModalOpen(false)}
        okText="저장"
        cancelText="취소"
        confirmLoading={accountLoading}
      >
        <Form form={accountForm} layout="vertical">
          <Form.Item name="name" label="계정명" rules={[{ required: true, message: '계정명을 입력해주세요.' }]}>
            <Input placeholder="예: 메인 계정, 블로그 계정" />
          </Form.Item>

          <Form.Item
            name="naverId"
            label="네이버 아이디"
            rules={[{ required: true, message: '네이버 아이디를 입력해주세요.' }]}
          >
            <Input placeholder="네이버 아이디" />
          </Form.Item>

          <Form.Item
            name="password"
            label="네이버 비밀번호"
            rules={[{ required: true, message: '네이버 비밀번호를 입력해주세요.' }]}
          >
            <Input.Password placeholder="네이버 비밀번호" />
          </Form.Item>

          <Form.Item name="isActive" label="활성화" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NaverAccountManagement

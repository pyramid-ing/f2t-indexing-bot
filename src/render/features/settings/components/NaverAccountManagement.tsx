import React, { useEffect, useState } from 'react'
import { Button, Form, Input, message, Modal, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { naverAccountApi } from '@render/api/naver/naverAccountApi'
import { NaverAccount } from '@render/api/types'

const { Title } = Typography

interface AddNaverAccountFormData {
  naverId: string
  password: string
  name: string
}

const NaverAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = useState<NaverAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await naverAccountApi.getAll()
      setAccounts(data)
    } catch (error) {
      console.error('Failed to load Naver accounts:', error)
      message.error('네이버 계정 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (values: AddNaverAccountFormData) => {
    try {
      setLoading(true)
      await naverAccountApi.create({
        ...values,
        isActive: true,
        isLoggedIn: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      message.success('네이버 계정이 추가되었습니다')
      setIsModalVisible(false)
      form.resetFields()
      await loadAccounts()
    } catch (error) {
      console.error('Failed to add Naver account:', error)
      message.error('네이버 계정 추가에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (id: number) => {
    try {
      await naverAccountApi.delete(id.toString())
      message.success('계정이 삭제되었습니다.')
      loadAccounts()
    } catch (error) {
      message.error('계정 삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      title: '계정 이름',
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
      render: (isActive: boolean) => (isActive ? '예' : '아니오'),
    },
    {
      title: '로그인 상태',
      dataIndex: 'isLoggedIn',
      key: 'isLoggedIn',
      render: (isLoggedIn: boolean) => (isLoggedIn ? '로그인됨' : '로그아웃'),
    },
    {
      title: '마지막 로그인',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '작업',
      key: 'action',
      width: '20%',
      render: (_: any, record: NaverAccount) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteAccount(record.id)}>
          삭제
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>네이버 계정 관리</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          계정 추가
        </Button>
      </div>

      <Table dataSource={accounts} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title="네이버 계정 추가"
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleAddAccount}>
          <Form.Item name="name" label="계정 이름" rules={[{ required: true, message: '계정 이름을 입력해주세요' }]}>
            <Input placeholder="예: 회사 계정" />
          </Form.Item>

          <Form.Item
            name="naverId"
            label="네이버 아이디"
            rules={[{ required: true, message: '네이버 아이디를 입력해주세요' }]}
          >
            <Input placeholder="네이버 아이디" />
          </Form.Item>

          <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
            <Input.Password placeholder="비밀번호" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default NaverAccountManagement

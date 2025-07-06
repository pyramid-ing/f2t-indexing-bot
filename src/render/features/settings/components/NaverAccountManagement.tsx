import React from 'react'
import { Button, Form, Input, message, Modal, Space, Table } from 'antd'
import { naverAccountApi } from '@render/api'

interface NaverAccount {
  id: string
  username: string
  password: string
  createdAt: string
  updatedAt: string
}

const NaverAccountManagement: React.FC = () => {
  const [accounts, setAccounts] = React.useState<NaverAccount[]>([])
  const [loading, setLoading] = React.useState(false)
  const [modalVisible, setModalVisible] = React.useState(false)
  const [form] = Form.useForm()

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await naverAccountApi.getAll()
      setAccounts(data)
    } catch (error) {
      message.error('계정 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadAccounts()
  }, [])

  const handleCreateAccount = async (values: any) => {
    try {
      await naverAccountApi.create(values)
      message.success('계정이 생성되었습니다.')
      loadAccounts()
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('계정 생성에 실패했습니다.')
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await naverAccountApi.delete(id)
      message.success('계정이 삭제되었습니다.')
      loadAccounts()
    } catch (error) {
      message.error('계정 삭제에 실패했습니다.')
    }
  }

  const columns = [
    {
      title: '아이디',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '수정일',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: NaverAccount) => (
        <Button danger onClick={() => handleDeleteAccount(record.id)}>
          삭제
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button type="primary" onClick={() => setModalVisible(true)}>
          새 계정 추가
        </Button>

        <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} />
      </Space>

      <Modal
        title="새 계정 추가"
        visible={modalVisible}
        onOk={form.submit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
      >
        <Form form={form} onFinish={handleCreateAccount} layout="vertical">
          <Form.Item name="username" label="아이디" rules={[{ required: true, message: '아이디를 입력해주세요' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default NaverAccountManagement

import React, { useState } from 'react'
import { Form, Input, Button, Card } from 'antd'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { login } from '../utils/auth'

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 64px);
  background-color: #f0f2f5;
`

const LoginCard = styled(Card)`
  width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`

const Logo = styled.div`
  text-align: center;
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
`

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const result = await login(values)
      if (result.success) {
        navigate('/add-keyword')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>지식 자동답변</Logo>
        <Form name="login" initialValues={{ remember: true }} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '이메일을 입력해주세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
            ]}
          >
            <Input size="large" placeholder="이메일" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
            <Input.Password size="large" placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={loading} block>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </LoginCard>
    </LoginContainer>
  )
}

export default Login

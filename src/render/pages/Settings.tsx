import React, { useEffect, useState } from 'react'
import { Typography, Card, Tabs, Form, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import AiSettings from '@render/features/settings/components/AiSettings'
import { getGlobalSettings, updateGlobalSettings } from '@render/api/siteConfigApi'

const { Title } = Typography

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const [globalSettings, setGlobalSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [globalSettingsForm] = Form.useForm()

  useEffect(() => {
    fetchGlobalSettings()
  }, [])

  const fetchGlobalSettings = async () => {
    try {
      const data = await getGlobalSettings()
      setGlobalSettings(data.data)
      // 전역 설정 폼 초기화
      if (data.data) {
        globalSettingsForm.setFieldsValue(data.data)
      }
    } catch (error) {
      console.error('Failed to load global settings:', error)
    }
  }

  const handleSaveGlobalSettings = async (values: any) => {
    try {
      setSavingSettings(true)
      await updateGlobalSettings(values)
      message.success('전역 설정이 저장되었습니다.')
      await fetchGlobalSettings() // 설정 다시 로드
    } catch (error) {
      console.error('Failed to save global settings:', error)
      message.error('전역 설정 저장에 실패했습니다.')
    } finally {
      setSavingSettings(false)
    }
  }

  const globalItems = [
    {
      key: 'ai',
      label: 'AI',
      children: <AiSettings settings={globalSettings} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>전역 설정</Title>
      </div>

      <Card>
        <Form form={globalSettingsForm} onFinish={handleSaveGlobalSettings} disabled={savingSettings} layout="vertical">
          <Tabs items={globalItems} type="card" />
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingSettings}>
              전역 설정 저장
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default SettingsPage

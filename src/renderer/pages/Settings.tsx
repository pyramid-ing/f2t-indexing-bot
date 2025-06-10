import React, { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import styled from 'styled-components'
import { ipcRenderer } from 'electron'
import SettingsForm from '../components/SettingsForm'

const StyledCard = styled(Card)`
  margin: 20px;
  max-width: 800px;
  margin: 20px auto;
`

interface SettingsData {
  apiKey: string
  intervalSec: number
  useAi: boolean
  aiProvider: string
  answerMode: 'auto' | 'manual'
  hideBrowser: boolean
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    apiKey: '',
    intervalSec: 60,
    useAi: false,
    aiProvider: 'openai',
    answerMode: 'manual',
    hideBrowser: false,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await ipcRenderer.invoke('load-settings')
      if (data) {
        setSettings(prev => ({
          ...prev,
          apiKey: data.apiKey ?? prev.apiKey,
          intervalSec: data.intervalSec ?? prev.intervalSec,
          useAi: data.useAi ?? prev.useAi,
          aiProvider: data.aiProvider ?? prev.aiProvider,
          answerMode: data.answerMode ?? prev.answerMode,
          hideBrowser: data.hideBrowser ?? prev.hideBrowser,
        }))
      }
    } catch (err) {
      console.error('설정 로드 중 오류:', err)
      message.error('설정을 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handleSave = async () => {
    try {
      const currentSettings = (await ipcRenderer.invoke('load-settings')) || {}

      const updatedSettings = {
        ...currentSettings,
        apiKey: settings.apiKey ?? currentSettings.apiKey,
        intervalSec: settings.intervalSec ?? currentSettings.intervalSec,
        useAi: settings.useAi ?? currentSettings.useAi,
        aiProvider: settings.aiProvider ?? currentSettings.aiProvider,
        answerMode: settings.answerMode ?? currentSettings.answerMode,
        hideBrowser: settings.hideBrowser ?? currentSettings.hideBrowser,
      }

      await ipcRenderer.invoke('save-settings', updatedSettings)
      message.success('설정이 저장되었습니다.')
    } catch (error) {
      console.error('설정 저장 중 오류:', error)
      message.error('설정 저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <StyledCard>
      <SettingsForm
        {...settings}
        onApiKeyChange={value => setSettings(prev => ({ ...prev, apiKey: value }))}
        onIntervalChange={value => setSettings(prev => ({ ...prev, intervalSec: value }))}
        onUseAiChange={value => setSettings(prev => ({ ...prev, useAi: value }))}
        onAiProviderChange={value => setSettings(prev => ({ ...prev, aiProvider: value }))}
        onAnswerModeChange={value => setSettings(prev => ({ ...prev, answerMode: value }))}
        onHideBrowserChange={value => setSettings(prev => ({ ...prev, hideBrowser: value }))}
        onSave={handleSave}
      />
    </StyledCard>
  )
}

export default Settings

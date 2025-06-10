import { getSettings, saveSettings } from '../repository/settingsRepository'

export const settingsManager = {
  async loadSettings() {
    return getSettings()
  },
  async saveSettings(data: any) {
    return saveSettings(data)
  },
}

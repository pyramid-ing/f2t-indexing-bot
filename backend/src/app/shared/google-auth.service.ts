import { Injectable } from '@nestjs/common'
import { GoogleAuth } from 'google-auth-library'
import { SettingsService } from './settings.service'

@Injectable()
export class GoogleAuthService {
  constructor(private readonly settingsService: SettingsService) {}

  private async createGoogleAuth(): Promise<GoogleAuth> {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const googleConfig = globalSettings.google

      if (!googleConfig.serviceAccountEmail || !googleConfig.privateKey) {
        throw new Error('Google Service Account 설정이 완료되지 않았습니다.')
      }

      // privateKey가 JSON 문자열인지 확인하고 파싱
      let privateKey = googleConfig.privateKey
      if (privateKey.startsWith('{')) {
        try {
          const keyData = JSON.parse(privateKey)
          privateKey = keyData.private_key
        } catch (error) {
          throw new Error('Private Key JSON 파싱 실패')
        }
      }

      // 개행 문자 처리
      privateKey = privateKey.replace(/\\n/g, '\n')

      return new GoogleAuth({
        credentials: {
          client_email: googleConfig.serviceAccountEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/indexing'],
      })
    } catch (error) {
      throw new Error(`Google Auth 설정 실패: ${error.message}`)
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const auth = await this.createGoogleAuth()
      const client = await auth.getClient()
      const accessTokenResponse = await client.getAccessToken()

      if (!accessTokenResponse.token) {
        throw new Error('액세스 토큰을 가져올 수 없습니다.')
      }

      return accessTokenResponse.token
    } catch (error) {
      throw new Error(`Google 인증 실패: ${error.message}`)
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken()
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  }
}

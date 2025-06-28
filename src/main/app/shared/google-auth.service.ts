import { Injectable } from '@nestjs/common'
import { GoogleAuth } from 'google-auth-library'
import { SettingsService } from 'src/main/app/shared/settings.service'

@Injectable()
export class GoogleAuthService {
  constructor(private readonly settingsService: SettingsService) {}

  private async createGoogleAuth(): Promise<GoogleAuth> {
    try {
      const globalSettings = await this.settingsService.getGlobalEngineSettings()
      const googleConfig = globalSettings.google

      if (!googleConfig.serviceAccountJson) {
        throw new Error('Google Service Account JSON 설정이 완료되지 않았습니다.')
      }

      // Service Account JSON 파싱
      let serviceAccountData
      try {
        serviceAccountData = JSON.parse(googleConfig.serviceAccountJson)
      }
      catch (error) {
        throw new Error('Service Account JSON 파싱 실패: 유효하지 않은 JSON 형식입니다.')
      }

      // 필수 필드 검증
      const requiredFields = ['client_email', 'private_key', 'type']
      const missingFields = requiredFields.filter(field => !serviceAccountData[field])

      if (missingFields.length > 0) {
        throw new Error(`Service Account JSON에 필수 필드가 누락되었습니다: ${missingFields.join(', ')}`)
      }

      if (serviceAccountData.type !== 'service_account') {
        throw new Error('Service Account JSON이 아닙니다. type이 "service_account"인지 확인해주세요.')
      }

      // 개행 문자 처리
      const privateKey = serviceAccountData.private_key.replace(/\\n/g, '\n')

      return new GoogleAuth({
        credentials: {
          client_email: serviceAccountData.client_email,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/indexing'],
      })
    }
    catch (error) {
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
    }
    catch (error) {
      throw new Error(`Google 인증 실패: ${error.message}`)
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken()
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  }
}

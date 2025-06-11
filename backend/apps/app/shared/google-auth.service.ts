import { Injectable } from '@nestjs/common'
import { GoogleAuth } from 'google-auth-library'

@Injectable()
export class GoogleAuthService {
  private auth: GoogleAuth

  constructor() {
    // Service Account 정보 (환경변수 또는 설정에서 가져오기)
    const serviceAccountEmail = 'prd-google-search-console@test-everything-461213.iam.gserviceaccount.com'
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''

    this.auth = new GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })
  }

  async getAccessToken(): Promise<string> {
    try {
      const client = await this.auth.getClient()
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

# Site Config Module

사이트별 색인 설정을 관리하는 모듈입니다. 각 사이트별로 Bing, Google, Daum, Naver 색인 서비스 설정을 저장하고 관리할 수 있습니다.

## 데이터베이스 스키마

### 주요 테이블
- `Site`: 사이트 기본 정보
- `BingConfig`: Bing 색인 설정
- `GoogleConfig`: Google 색인 및 OAuth 설정
- `DaumConfig`: Daum 색인 설정
- `NaverConfig`: Naver 색인 설정
- `IndexingLog`: 색인 작업 로그

## API 엔드포인트

### 1. 사이트 설정 생성
```
POST /site-config
```

**요청 Body:**
```json
{
  "siteUrl": "https://pyramid-ing.com",
  "blogType": "BLOGGER",
  "indexingUrls": [
    "https://pyramid-ing.com/post1",
    "https://pyramid-ing.com/post2"
  ],
  "bing": {
    "use": true,
    "apiKey": "your-bing-api-key"
  },
  "google": {
    "use": true,
    "serviceAccountEmail": "service@test-project.iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "oauth2ClientId": "788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com",
    "oauth2ClientSecret": "your-client-secret"
  },
  "daum": {
    "use": true,
    "siteUrl": "https://pyramid-ing.com",
    "password": "your-password"
  },
  "naver": {
    "use": true,
    "naverId": "your-naver-id",
    "password": "your-password"
  }
}
```

### 2. 모든 사이트 설정 조회
```
GET /site-config
```

**응답:**
```json
{
  "sites": [
    {
      "id": 1,
      "siteUrl": "https://pyramid-ing.com",
      "blogType": "BLOGGER",
      "indexingUrls": ["https://pyramid-ing.com/post1"],
      "bing": {
        "use": true,
        "apiKey": "****"
      },
      "google": {
        "use": true,
        "serviceAccountEmail": "service@test-project.iam.gserviceaccount.com",
        "oauth2ClientId": "788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com",
        "privateKey": "****",
        "oauth2ClientSecret": "****"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. 특정 사이트 설정 조회
```
GET /site-config/:siteUrl
```

### 4. 사이트 설정 업데이트
```
PUT /site-config/:siteUrl
```

### 5. 사이트 설정 삭제
```
DELETE /site-config/:siteUrl
```

### 6. 서비스별 개별 설정 업데이트

#### Bing 설정 업데이트
```
PUT /site-config/:siteUrl/bing
```

**요청 Body:**
```json
{
  "use": true,
  "apiKey": "new-api-key"
}
```

#### Google 설정 업데이트
```
PUT /site-config/:siteUrl/google
```

**요청 Body:**
```json
{
  "use": true,
  "serviceAccountEmail": "service@test-project.iam.gserviceaccount.com",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
  "oauth2ClientId": "your-client-id",
  "oauth2ClientSecret": "your-client-secret",
  "oauth2AccessToken": "ya29.a0ARrdaM9...",
  "oauth2RefreshToken": "1//04...",
  "oauth2TokenExpiry": "2024-01-01T01:00:00.000Z"
}
```

#### Daum 설정 업데이트
```
PUT /site-config/:siteUrl/daum
```

#### Naver 설정 업데이트
```
PUT /site-config/:siteUrl/naver
```

## 사용 예시

### 1. 새 사이트 설정 생성
```bash
curl -X POST http://localhost:3030/site-config \
  -H "Content-Type: application/json" \
  -d '{
    "siteUrl": "https://myblog.com",
    "blogType": "TISTORY",
    "indexingUrls": ["https://myblog.com/post1"],
    "bing": {
      "use": true,
      "apiKey": "06305dbe6ab34b0b9727f3c44dc0c802"
    },
    "google": {
      "use": true,
      "oauth2ClientId": "788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com"
    }
  }'
```

### 2. Google OAuth 토큰 업데이트
```bash
curl -X PUT http://localhost:3030/site-config/https%3A%2F%2Fmyblog.com/google \
  -H "Content-Type: application/json" \
  -d '{
    "use": true,
    "oauth2AccessToken": "ya29.new-access-token",
    "oauth2RefreshToken": "1//04new-refresh-token",
    "oauth2TokenExpiry": "2024-01-01T01:00:00.000Z"
  }'
```

## 보안 고려사항

1. **민감한 정보 마스킹**: API Key, Password, Private Key 등은 조회 시 `****`로 마스킹됩니다.
2. **URL 인코딩**: 사이트 URL은 URL 인코딩하여 요청해야 합니다.
3. **트랜잭션**: 관련 설정들은 트랜잭션으로 처리되어 데이터 일관성을 보장합니다.

## 색인 로그

색인 작업의 결과는 `IndexingLog` 테이블에 자동으로 기록됩니다:

```typescript
// 색인 로그 생성 예시
await prisma.createIndexingLog({
  siteUrl: 'https://myblog.com',
  targetUrl: 'https://myblog.com/post1',
  provider: 'GOOGLE',
  status: 'SUCCESS',
  message: '색인 요청 완료',
  responseData: { /* API 응답 데이터 */ }
})
``` 
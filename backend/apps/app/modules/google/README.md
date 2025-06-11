# Google Module

Google API 관련 모든 서비스를 관리하는 상위 모듈입니다.

## 구조

```
google/
├── google.module.ts           # Google 상위 모듈
├── indexer/                   # Google Indexing API
│   ├── google-indexer.module.ts
│   ├── google-indexer.service.ts
│   └── google-indexer.controller.ts
├── blogger/                   # Google Blogger API
│   ├── google-blogger.module.ts
│   ├── google-blogger.service.ts
│   └── google-blogger.controller.ts
├── oauth/                     # Google OAuth2 인증
│   ├── google-oauth.module.ts
│   └── google-oauth.controller.ts
├── search-console/            # Google Search Console API (예시)
│   └── google-search-console.module.ts
└── README.md
```

## 하위 모듈

### 1. Google Indexer
- **경로**: `/google-indexer/manual-index`
- **기능**: Google Indexing API를 통한 URL 색인 요청
- **지원 작업**: URL_UPDATED, URL_DELETED

### 2. Google Blogger
- **경로**: `/google-blogger/*`
- **기능**: Google Blogger API를 통한 블로그 게시물 조회
- **인증 방식**: OAuth2 Access Token
- **주요 기능**:
  - 블로그 게시물 목록 조회
  - 특정 게시물 조회
  - 블로그 정보 조회
  - 사용자 블로그 목록 조회

### 3. Google OAuth2
- **경로**: `/google-oauth/callback`
- **기능**: Google OAuth2 인증 콜백 처리
- **내부 처리**: 인증 코드를 HTML 페이지로 표시하여 사용자가 복사 가능

### 4. Google Search Console (향후 확장)
- Google Search Console API 연동 예정
- 사이트 성능, 검색 결과 등 데이터 조회

## 사용법

### app.module.ts에서 import
```typescript
import { GoogleModule } from './modules/google/google.module'

@Module({
  imports: [
    // ... other modules
    GoogleModule,
  ],
})
export class AppModule {}
```

### API 엔드포인트

#### Google Indexer
- `POST /google-indexer/manual-index` - URL 색인 요청

#### Google Blogger
- `POST /google-blogger/posts` - 블로그 게시물 목록 조회
- `GET /google-blogger/blogs/:blogId/posts/:postId` - 특정 게시물 조회
- `GET /google-blogger/blogs/:blogId` - 블로그 정보 조회
- `POST /google-blogger/blogs/by-url` - URL로 블로그 정보 조회
- `GET /google-blogger/user/blogs` - 사용자 블로그 목록 조회

#### Google OAuth2
- `GET /google-oauth/callback` - OAuth2 인증 콜백 (내부 처리)

## 향후 확장 계획

새로운 Google API 연동 시 다음과 같은 구조로 추가:

```
google/
├── google.module.ts
├── indexer/
├── search-console/
├── analytics/              # Google Analytics API
├── ads/                    # Google Ads API
└── drive/                  # Google Drive API
``` 
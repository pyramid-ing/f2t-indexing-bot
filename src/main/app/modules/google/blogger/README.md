# Google Blogger API Module

Google Blogger API를 활용하여 블로그스팟 게시물을 조회하는 모듈입니다.

## 주요 특징

- **자동 토큰 관리**: OAuth2 토큰이 서버 DB에 저장되어 자동으로 사용됩니다.
- **자동 토큰 갱신**: 만료된 토큰은 자동으로 갱신됩니다.
- **보안성 향상**: 클라이언트에서 토큰을 관리할 필요가 없습니다.

## OAuth2 인증 정보

OAuth2 설정은 설정 페이지에서 관리됩니다:

- **Client ID**: Google Cloud Console에서 발급받은 OAuth2 Client ID
- **Client Secret**: Google Cloud Console에서 발급받은 OAuth2 Client Secret
- **Redirect URI**: `http://localhost:3030/google-oauth/callback`
- **Scope**: `https://www.googleapis.com/auth/blogger`

## API 엔드포인트

### 1. 블로그 게시물 목록 조회

```
POST /google-blogger/posts
```

**요청 Body:**

```json
{
  "blogUrl": "https://example.blogspot.com",
  "maxResults": 10,
  "status": "live"
}
```

**또는 blogId 사용:**

```json
{
  "blogId": "1234567890",
  "maxResults": 10,
  "status": "live"
}
```

### 2. 특정 게시물 조회

```
GET /google-blogger/blogs/:blogId/posts/:postId
```

### 3. 블로그 정보 조회

```
GET /google-blogger/blogs/:blogId
```

### 4. URL로 블로그 정보 조회

```
POST /google-blogger/blogs/by-url
```

**요청 Body:**

```json
{
  "blogUrl": "https://example.blogspot.com"
}
```

### 5. 사용자 블로그 목록 조회

```
GET /google-blogger/user/blogs
```

## 사용 예시

### 1. 블로그 게시물 조회

```bash
curl -X POST http://localhost:3030/google-blogger/posts \
  -H "Content-Type: application/json" \
  -d '{
    "blogUrl": "https://pyramid-ing.blogspot.com",
    "maxResults": 5,
    "status": "live"
  }'
```

### 2. 사용자 블로그 목록 조회

```bash
curl -X GET "http://localhost:3030/google-blogger/user/blogs"
```

### 3. 블로그 정보 조회 (URL 사용)

```bash
curl -X POST http://localhost:3030/google-blogger/blogs/by-url \
  -H "Content-Type: application/json" \
  -d '{
    "blogUrl": "https://pyramid-ing.blogspot.com"
  }'
```

## OAuth2 Flow

1. **설정 페이지에서 OAuth2 설정**: Client ID, Client Secret 입력
2. **Google 로그인**: 브라우저에서 Google OAuth 진행
3. **자동 토큰 저장**: 서버에서 자동으로 토큰 교환 및 저장
4. **API 사용**: 별도 토큰 전달 없이 API 호출 가능

## 에러 처리

### 토큰 관련 에러

- `Google OAuth 토큰이 없습니다. 먼저 로그인해주세요.`: 설정에서 Google 로그인 필요
- `Google 토큰 갱신 실패: ... 다시 로그인해주세요.`: Refresh Token이 만료되어 재로그인 필요

### API 호출 에러

- `블로그 정보 조회 실패: ...`: Blogger API 호출 실패 (블로그 ID, 권한 등 확인)
- `게시물 조회 실패: ...`: 게시물 ID 오류 또는 권한 부족

## 응답 예시

### 블로그 게시물 목록

```json
{
  "posts": {
    "kind": "blogger#postList",
    "items": [
      {
        "id": "1234567890",
        "title": "게시물 제목",
        "content": "게시물 내용...",
        "url": "https://pyramid-ing.blogspot.com/2024/01/post.html",
        "published": "2024-01-01T10:00:00Z",
        "updated": "2024-01-01T10:00:00Z",
        "author": {
          "id": "user123",
          "displayName": "작성자"
        },
        "labels": ["태그1", "태그2"]
      }
    ],
    "nextPageToken": "CgkI...",
    "totalItems": 100
  }
}
```

### 사용자 블로그 목록

```json
{
  "blogs": {
    "kind": "blogger#blogList",
    "items": [
      {
        "id": "1234567890",
        "name": "My Blog",
        "description": "블로그 설명",
        "url": "https://example.blogspot.com",
        "posts": {
          "totalItems": 150,
          "selfLink": "https://www.googleapis.com/blogger/v3/blogs/1234567890/posts"
        }
      }
    ]
  }
}
```

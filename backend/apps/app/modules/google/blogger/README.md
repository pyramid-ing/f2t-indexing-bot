# Google Blogger API Module

Google Blogger API를 활용하여 블로그스팟 게시물을 조회하는 모듈입니다.

## OAuth2 인증 정보

스크린샷에서 확인된 OAuth2 설정:
- **Client ID**: `788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com`
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
  "accessToken": "YOUR_ACCESS_TOKEN",
  "maxResults": 10,
  "status": "live"
}
```

### 2. 특정 게시물 조회
```
GET /google-blogger/blogs/:blogId/posts/:postId?accessToken=YOUR_ACCESS_TOKEN
```

### 3. 블로그 정보 조회
```
GET /google-blogger/blogs/:blogId?accessToken=YOUR_ACCESS_TOKEN
```

### 4. URL로 블로그 정보 조회
```
POST /google-blogger/blogs/by-url
```

**요청 Body:**
```json
{
  "blogUrl": "https://example.blogspot.com",
  "accessToken": "YOUR_ACCESS_TOKEN"
}
```

### 5. 사용자 블로그 목록 조회
```
GET /google-blogger/user/blogs?accessToken=YOUR_ACCESS_TOKEN
```

## 사용 예시

### 1. 블로그 게시물 조회
```bash
curl -X POST http://localhost:3000/google-blogger/posts \
  -H "Content-Type: application/json" \
  -d '{
    "blogUrl": "https://pyramid-ing.blogspot.com",
    "accessToken": "ya29.a0ARrdaM9...",
    "maxResults": 5,
    "status": "live"
  }'
```

### 2. 사용자 블로그 목록 조회
```bash
curl -X GET "http://localhost:3000/google-blogger/user/blogs?accessToken=ya29.a0ARrdaM9..."
```

## OAuth2 Flow

1. **인증 URL 생성**:
   ```
   https://accounts.google.com/oauth2/v2/auth?
   client_id=788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com&
   redirect_uri=http://localhost:3030/google-oauth/callback&
   scope=https://www.googleapis.com/auth/blogger&
   response_type=code&
   access_type=offline
   ```

2. **Authorization Code 교환**:
   ```bash
   curl -X POST https://oauth2.googleapis.com/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=788251656266-5j49jprf9mgkputnod6b885jijakgd.apps.googleusercontent.com" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=http://localhost:3030/google-oauth/callback"
   ```

3. **Access Token 사용**: 응답에서 받은 `access_token`을 API 호출 시 사용

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
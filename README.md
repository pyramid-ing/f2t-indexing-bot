# F2T Indexing Bot

네이버, 구글, 빙, 다음 등 주요 검색엔진에 URL을 자동으로 색인 요청하는 봇입니다.

## 주요 기능

### 네이버 색인 요청
- 네이버 서치어드바이저를 통한 자동 색인 요청
- 쿠키 기반 세션 관리
- **AI 기반 캡챠 자동 해제** (OpenAI GPT-4 Vision 활용)
- 다중 계정 지원

### 구글 색인 요청
- Google Indexing API를 통한 자동 색인 요청
- Service Account 기반 인증

### 빙 색인 요청
- Bing Webmaster Tools API를 통한 자동 색인 요청
- API 키 기반 인증

### 다음 색인 요청
- 다음 웹마스터 도구를 통한 자동 색인 요청
- PIN 기반 인증

## 새로운 기능: AI 캡챠 해제

네이버 로그인 시 캡챠가 나타나는 경우, OpenAI GPT-4 Vision을 이용하여 자동으로 해제합니다.

### 설정 방법

1. OpenAI API 키 설정:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

2. 환경 변수 설정:
```bash
export COOKIE_DIR="/path/to/cookie/directory"
```

### 동작 방식

1. 네이버 로그인 시도
2. 캡챠 감지 (`.captcha_wrap` 요소 확인)
3. 캡챠 이미지 추출 (`#captchaimg` 요소의 base64 데이터)
4. OpenAI GPT-4 Vision API 호출하여 텍스트 추출
5. 추출된 텍스트를 캡챠 입력 필드에 자동 입력
6. 로그인 버튼 클릭

### 에러 처리

- `NAVER_CAPTCHA_DETECTED`: 캡챠 감지됨
- `NAVER_CAPTCHA_SOLVE_FAILED`: 캡챠 해제 실패
- `NAVER_AI_SERVICE_ERROR`: AI 서비스 오류

AI 서비스 실패 시 수동 입력 모드로 전환되어 사용자가 직접 캡챠를 해제할 수 있습니다.

## 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build
```

## 환경 변수

- `OPENAI_API_KEY`: OpenAI API 키 (캡챠 해제용)
- `COOKIE_DIR`: 쿠키 저장 디렉토리
- `NODE_ENV`: 환경 설정 (development/production)

## 라이선스

MIT License

# F2T 인덱싱 봇

블로그 포스트를 Google, Bing, Naver, Daum에 자동으로 색인 요청하는 Electron 앱입니다.

## 빠른 시작

### 1. 백엔드 서버 실행

```bash
cd backend
npm install
npm run dev
```

### 2. 프론트엔드 실행

```bash
npm install
npm run dev
```

## 특징

- **자동 데이터베이스 초기화**: 첫 실행 시 SQLite 데이터베이스가 자동으로 생성됩니다
- **4개 검색엔진 지원**: Google, Bing, Naver, Daum
- **사이트 관리**: 여러 사이트의 인덱싱 설정을 관리할 수 있습니다
- **실시간 로그**: 인덱싱 작업의 성공/실패 로그를 확인할 수 있습니다

## 폴더 구조

```
├── backend/                 # NestJS 백엔드
│   ├── apps/               # 앱 모듈들
│   ├── prisma/             # 데이터베이스 스키마
│   └── ...
├── src/
│   ├── electron/           # Electron 메인 프로세스
│   └── renderer/           # React 프론트엔드
└── ...
```

## 문제 해결

### 백엔드 연결 오류
- 백엔드 서버가 실행 중인지 확인: `cd backend && npm run dev`
- 포트 3030이 사용 중이 아닌지 확인

### 데이터베이스 오류
- 데이터베이스는 첫 실행 시 자동으로 초기화됩니다
- 수동 재초기화: `cd backend && npm run db:reset` 
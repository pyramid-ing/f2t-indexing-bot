
# PRD Util Backend

`PRD Util Backend`은 NestJS를 기반으로 하는 백엔드 애플리케이션입니다. 이 애플리케이션은 Docker를 사용하여 빌드 및 배포할 수 있습니다.

## 요구 사항

- Node.js: `^18.x`
- Docker 설치 필요

## 설치 및 실행

### 1. Docker 이미지 빌드

애플리케이션을 실행하기 전에 Docker 이미지를 빌드해야 합니다. 다음 명령어를 사용하여 이미지를 빌드합니다.

```bash
docker build -t prd-util-backend .
```

### 2. Docker 컨테이너 실행

Docker 이미지를 빌드한 후, 다음 명령어를 사용하여 애플리케이션을 실행합니다.

```bash
docker run -p 3000:3000 prd-util-backend
```

이 명령어는 애플리케이션을 `http://localhost:3000`에서 실행합니다.

## N8N 실행

`N8N`을 실행하려면 다음 명령어를 사용하세요. 이 명령어는 N8N을 Docker 컨테이너로 실행하며, `5678` 포트에서 접근 가능합니다.

```bash
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

## IP 주소 확인 및 Docker 설치

Docker가 설치된 시스템의 내부 IP 주소를 찾아서 설정해야 할 수 있습니다. 아래 이미지를 참고하여 내부 IP 주소를 확인한 후 수정하세요.

![http_local_ip_n8n.png](.github_images/http_local_ip_n8n.png)

![http_local_ip_terminal.png](.github_images/http_local_ip_terminal.png)

## 프로젝트 설정

### 주요 스크립트

- **개발 모드로 실행**: 로컬 개발 환경에서 서버를 실행합니다.

  ```bash
  yarn dev
  ```

- **프로덕션 빌드**: 애플리케이션을 프로덕션용으로 빌드합니다.

  ```bash
  yarn build
  ```

- **프로덕션 모드로 실행**: 프로덕션 빌드를 실행합니다.

  ```bash
  yarn start:prod
  ```

- **디버그 모드 실행**: 디버그 모드에서 서버를 실행합니다.

  ```bash
  yarn start:debug
  ```

### 환경 변수

`.env` 파일에서 환경 변수를 설정할 수 있습니다. 다음과 같은 형식으로 파일을 생성하여 필요한 값을 설정합니다.

```
NODE_ENV=production
```

### 주요 라이브러리

- **NestJS**: 백엔드 프레임워크
- **Axios**: HTTP 클라이언트
- **Day.js**: 날짜 관리 라이브러리
- **Puppeteer**: 브라우저 자동화 도구
- **Winston**: 로깅 라이브러리
- **Notion API**: Notion 클라이언트

## Docker 구성

이 애플리케이션은 멀티스테이지 빌드를 사용하여 최적화된 이미지를 생성합니다.

### 1단계: 빌드

- `node:18` 이미지를 기반으로 소스 코드를 빌드합니다.
- 의존성을 설치하고 `yarn build`를 실행하여 애플리케이션을 빌드합니다.

### 2단계: 실행

- `node:18-slim` 이미지를 기반으로 빌드된 애플리케이션을 실행합니다.
- 프로덕션 의존성만 설치하여 경량 이미지를 생성합니다.
- 포트 `3000`에서 애플리케이션을 실행합니다.

## 라이선스

이 프로젝트는 [UNLICENSED](LICENSE)를 따릅니다.

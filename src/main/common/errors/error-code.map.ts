import { ErrorCode } from './error-code.enum'

export interface ErrorCodeMeta {
  status: number
  message: (metadata?: Record<string, any>) => string
}

export const ErrorCodeMap: Record<ErrorCode, ErrorCodeMeta> = {
  // 유저 관련
  [ErrorCode.USER_NOT_FOUND]: { status: 404, message: () => '사용자를 찾을 수 없습니다.' },
  [ErrorCode.USER_DUPLICATE]: { status: 409, message: () => '이미 존재하는 사용자입니다.' },

  // 서버/기타
  [ErrorCode.INTERNAL_ERROR]: { status: 500, message: () => '서버 내부 오류' },

  // Bing 관련
  [ErrorCode.BING_CONFIG_DISABLED]: { status: 400, message: () => 'Bing 색인이 비활성화되어 있습니다.' },
  [ErrorCode.BING_API_KEY_MISSING]: { status: 400, message: () => 'Bing API 키가 설정되지 않았습니다.' },
  [ErrorCode.BING_API_AUTH_FAIL]: {
    status: 401,
    message: () => 'Bing API 인증이 실패했습니다. API 키를 확인해주세요.',
  },
  [ErrorCode.BING_API_FORBIDDEN]: {
    status: 403,
    message: () => 'Bing API 권한이 없습니다. 사이트 등록 및 API 키 권한을 확인해주세요.',
  },
  [ErrorCode.BING_API_RATE_LIMIT]: {
    status: 429,
    message: () => 'Bing API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  },
  [ErrorCode.BING_API_INVALID_KEY]: { status: 400, message: () => 'Bing API Key가 유효하지 않습니다. (InvalidApiKey)' },
  [ErrorCode.BING_API_ERROR]: { status: 502, message: meta => `Bing API 오류: ${meta?.errorMessage || ''}` },
  [ErrorCode.BING_UNKNOWN_ERROR]: { status: 500, message: meta => `Bing 색인 요청 실패: ${meta?.errorMessage || ''}` },

  // Google 관련
  [ErrorCode.GOOGLE_CONFIG_DISABLED]: { status: 400, message: () => 'Google 색인이 비활성화되어 있습니다.' },
  [ErrorCode.GOOGLE_SERVICE_ACCOUNT_MISSING]: {
    status: 400,
    message: () => 'Google Service Account JSON이 설정되지 않았습니다.',
  },
  [ErrorCode.GOOGLE_AUTH_FAIL]: { status: 401, message: () => 'Google API 인증이 실패했습니다. 토큰을 확인해주세요.' },
  [ErrorCode.GOOGLE_API_FORBIDDEN]: {
    status: 403,
    message: () => 'Google Indexing API 권한이 없습니다. 서비스 계정 권한을 확인해주세요.',
  },
  [ErrorCode.GOOGLE_API_RATE_LIMIT]: {
    status: 429,
    message: () => 'Google API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  },
  [ErrorCode.GOOGLE_API_INVALID_KEY]: { status: 400, message: () => 'Google API Key가 유효하지 않습니다.' },
  [ErrorCode.GOOGLE_API_ERROR]: { status: 502, message: meta => `Google API 오류: ${meta?.errorMessage || ''}` },
  [ErrorCode.GOOGLE_UNKNOWN_ERROR]: {
    status: 500,
    message: meta => `Google 색인 요청 실패: ${meta?.errorMessage || ''}`,
  },

  // Naver 관련
  [ErrorCode.NAVER_CONFIG_DISABLED]: { status: 400, message: () => '네이버 색인이 비활성화되어 있습니다.' },
  [ErrorCode.NAVER_ACCOUNT_NOT_SELECTED]: { status: 400, message: () => '사이트에 네이버 계정이 선택되지 않았습니다.' },
  [ErrorCode.NAVER_ACCOUNT_NOT_FOUND]: { status: 404, message: () => '등록되지 않은 네이버 계정입니다.' },
  [ErrorCode.NAVER_ACCOUNT_INACTIVE]: { status: 400, message: () => '비활성화된 네이버 계정입니다.' },
  [ErrorCode.NAVER_AUTH_FAIL]: {
    status: 401,
    message: () => '네이버 인증이 실패했습니다. 쿠키 또는 계정 정보를 확인해주세요.',
  },
  [ErrorCode.NAVER_UNKNOWN_ERROR]: {
    status: 500,
    message: meta => `네이버 색인 요청 실패: ${meta?.errorMessage || ''}`,
  },
  [ErrorCode.NAVER_ACCOUNT_DUPLICATE]: { status: 409, message: () => '이미 등록된 네이버 아이디입니다.' },

  // Daum 관련
  [ErrorCode.DAUM_CONFIG_DISABLED]: { status: 400, message: () => 'Daum 색인이 비활성화되어 있습니다.' },
  [ErrorCode.DAUM_AUTH_FAIL]: {
    status: 401,
    message: () => 'Daum 인증이 실패했습니다. PIN 또는 계정 정보를 확인해주세요.',
  },
  [ErrorCode.DAUM_UNKNOWN_ERROR]: { status: 500, message: meta => `Daum 색인 요청 실패: ${meta?.errorMessage || ''}` },

  // 사이트 관련
  [ErrorCode.SITE_NOT_FOUND]: { status: 404, message: () => '사이트를 찾을 수 없습니다.' },
  [ErrorCode.SITE_DOMAIN_DUPLICATE]: { status: 409, message: () => '이미 존재하는 도메인입니다.' },
  [ErrorCode.SITE_INACTIVE]: { status: 400, message: () => '비활성화된 사이트입니다.' },
  [ErrorCode.SITE_DOMAIN_MISMATCH]: { status: 400, message: () => '도메인이 일치하지 않습니다.' },
}

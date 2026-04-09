# ReviewNovel 📚

다양한 웹소설 플랫폼의 소설 정보를 한 번에 검색하고, 실시간으로 리뷰를 공유할 수 있는 웹 애플리케이션입니다.

## 🛠️ 기술 스택

### Frontend
- **React 18**: 사용자 인터페이스 구축
- **Vite**: 빠른 개발 환경과 빌드 도구
- **Supabase**: 실시간 데이터베이스 및 인증 처리
- **CSS Modules**: 컴포넌트 단위 스타일링

### Backend
- **Node.js & Express**: 서버 및 API 구축
- **Cheerio**: 웹 크롤링을 위한 HTML 파싱
- **SSE (Server-Sent Events)**: 실시간 검색 결과 스트리밍

## 📂 프로젝트 구조

```
ReviewNovel/
├── backend/
│   ├── crawlers/       # 각 플랫폼별 크롤러 로직
│   ├── routes/         # API 엔드포인트 (search, review, ranking)
│   ├── reviews/        # 리뷰 요약 AI 로직
│   └── server.js       # 백엔드 진입점 (Express + 미들웨어)
├── frontend/
│   ├── src/
│   │   ├── components/ # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/      # 페이지 컴포넌트
│   │   └── hooks/      # 커스텀 훅 (데이터 fetching 등)
│   └── .env            # 환경 변수 (Git 제외)
├── scripts/
│   ├── init-db.js      # 데이터베이스 초기화 스크립트
│   └── capture-network.js  # Playwright API 캡처 도구
├── test-ranking.sh     # 랭킹 API 테스트 스크립트
├── supabase_schema.sql # 데이터베이스 스키마 (참고용)
└── SETUP_SUPABASE.md   # Supabase 설정 가이드
```

## 🔒 보안 및 주의사항

- **환경 변수**: `.env` 파일은 Git에 포함되지 않도록 관리됩니다.

### Backend 환경 변수 (backend/.env)
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
OPENROUTER_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here       # optional
GOOGLE_CX=your_cx_here             # optional
REVIEW_MODEL=qwen/qwen3.6-plus:free
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
MAX_CONCURRENT_NOVELS=2
```

### Frontend 환경 변수 (frontend/.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

- **보안**: React의 기본 이스케이프 처리와 Supabase의 RLS를 통해 보안을 유지합니다.
- **데이터**: 리뷰 데이터는 Supabase PostgreSQL에 영구 저장됩니다.
- **입력 검증**: 검색어 XSS 방지(HTML 태그 제거, 길이 제한)가 적용되어 있습니다.
- **Rate Limiting**: 분당 요청 수를 제한하여 API 남용을 방지합니다.

## 📝 라이선스
이 프로젝트는 학습 및 개인적인 용도로 개발되었습니다.
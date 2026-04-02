# Supabase 연동 설정 가이드

## 1. Supabase 프로젝트 준비
1. [supabase.com](https://supabase.com)에서 계정 생성 및 새 프로젝트 생성
2. **SQL Editor**에서 `supabase_schema.sql` 파일의 내용을 실행하여 테이블 생성
3. **Settings > API**에서 다음 정보 확인:
   - Project URL
   - `anon` public key

## 2. 환경 변수 설정
`frontend/.env` 파일을 생성하고 아래 내용을 입력하세요:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. 의존성 설치
```bash
cd frontend
npm install
```

## 4. 실행
```bash
npm run dev
```

## 주요 기능
- **실시간 리뷰**: Supabase Realtime을 이용해 다른 사용자가 작성한 리뷰가 즉시 반영됩니다.
- **영구 저장**: 작성된 리뷰는 데이터베이스에 저장되어 브라우저를 닫아도 유지됩니다.
- **익명성**: 닉네임을 입력하지 않으면 자동으로 '익명'으로 처리됩니다.
# ReviewNovel 📚

다양한 웹소설 플랫폼(카카오페이지, 네이버 시리즈, 문피아, 노벨피아, 조아라)의 소설 정보를 한 번에 검색하고, 실시간 리뷰를 공유할 수 있는 웹 애플리케이션입니다.

## 🛠️ Tech Stack

### Frontend
- **React 18**
- **Vite**
- **React Router DOM**
- **Supabase** (실시간 데이터베이스 및 인증)
- **CSS Modules**

### Backend
- **Node.js & Express**
- **Cheerio** (HTML 파싱 및 크롤링)
- **Server-Sent Events (SSE)** (실시간 검색 결과 스트리밍)

## 🚀 Getting Started

### 1.Clone the repository
```bash
git clone <your-repository-url>
cd ReviewNovel
```

### 2. Backend Setup
```bash
cd backend
npm install
npm start
# Server will run on http://localhost:4000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Client will run on http://localhost:5173
```

### 4. Supabase Configuration
1. Create a project at [Supabase](https://supabase.com).
2. Create a `.env` file in the `frontend` directory:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the SQL script in `supabase_schema.sql` in your Supabase SQL Editor.

## 📂 Project Structure

```
ReviewNovel/
├── backend/
│   ├── crawlers/       # Platform-specific web scrapers
│   ├── routes/         # API endpoints
│   ├── utils/          # Helper functions
│   └── server.js       # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components (Home, Results)
│   │   ├── hooks/      # Custom hooks (useReviews)
│   │   └── lib/        # Supabase client setup
│   └── .env            # Environment variables
└── README.md
```

## 🔒 Security
- **Environment Variables:** Sensitive keys are managed via `.env` and ignored by Git.
- **XSS Protection:** React's built-in escaping prevents script injection.
- **RLS:** Supabase Row Level Security policies protect database integrity.

## 📝 License
This project is for educational and personal use.
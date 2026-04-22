"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const searchRouter = require("./routes/search");
const reviewRouter = require("./routes/review");
const rankingRouter = require("./routes/ranking");
const rankingCacheRouter = require("./routes/rankingCache");
const novelsRouter = require("./routes/novels");
const recommendRouter = require("./routes/recommend");
const { crawlAndStoreRankings } = require("./routes/rankingScheduler");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ── Rate Limiting (simple in-memory) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // default 1min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '30', 10); // default 30 requests/window

// Routes that are cheap DB reads — exempt from rate limiting
const RATE_LIMIT_EXEMPT = ['/api/ranking/cached', '/api/novels/autocomplete'];

function rateLimiter(req, res, next) {
  if (RATE_LIMIT_EXEMPT.some(p => req.path.startsWith(p))) return next();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }
  const record = rateLimitMap.get(ip);
  if (now - record.start > RATE_LIMIT_WINDOW) {
    record.count = 1;
    record.start = now;
    return next();
  }
  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.' });
  }
  next();
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use(rateLimiter);
app.use("/api", searchRouter);
app.use("/api", reviewRouter);
app.use("/api", rankingRouter);
app.use("/api", rankingCacheRouter);
app.use("/api", novelsRouter);
app.use("/api", recommendRouter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "서버 오류" });
});

// Ranking scheduler: every 5 hours
cron.schedule("0 */5 * * *", () => {
  console.log("[SCHEDULER] Triggered ranking crawl (5h interval)");
  crawlAndStoreRankings().catch(e => console.error("[SCHEDULER] Cron error:", e.message));
});

function start() {
  app.listen(PORT, () => {
    console.log(`ReviewNovel 백엔드 서버 실행 중: http://localhost:${PORT}`);
    // Run initial crawl on startup if DB is configured
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY)) {
      console.log("[SCHEDULER] Running initial ranking crawl on startup...");
      crawlAndStoreRankings().catch(e => console.error("[SCHEDULER] Initial crawl error:", e.message));
    }
  });
}

process.on("SIGINT", () => {
  console.log("\n서버 종료 중...");
  process.exit(0);
});

try {
  start();
} catch (err) {
  console.error("서버 시작 실패:", err);
  process.exit(1);
}

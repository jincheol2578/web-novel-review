"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const searchRouter = require("./routes/search");
const reviewRouter = require("./routes/review");
const rankingRouter = require("./routes/ranking");
const recommendRouter = require("./routes/recommend");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ── Rate Limiting (simple in-memory) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // default 1min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '30', 10); // default 30 requests/window

function rateLimiter(req, res, next) {
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
app.use("/api", recommendRouter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "서버 오류" });
});

function start() {
  app.listen(PORT, () => {
    console.log(`ReviewNovel 백엔드 서버 실행 중: http://localhost:${PORT}`);
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

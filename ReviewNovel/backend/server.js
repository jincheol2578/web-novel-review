"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const searchRouter = require("./routes/search");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use("/api", searchRouter);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "서버 오류" });
});

function start() {
  app.listen(PORT, () => {
    console.log(`ReviewNovel 백엔드g 서버 실행 중: http://localhost:${PORT}`);
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

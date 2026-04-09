'use strict';

const express = require('express');
const { searchNovels } = require('../crawlers/index');

const router = express.Router();

// Sanitize input: escape potential XSS, limit length
function sanitizeTitle(title) {
  const sanitized = title
    .replace(/[<>]/g, '')  // Remove script-injection chars
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 200);  // Limit length
  return sanitized;
}

/**
 * GET /api/search/stream?novels=소설1,소설2
 * Server-Sent Events stream - sends platform results as they complete
 */
router.get('/search/stream', async (req, res) => {
  const novelsParam = req.query.novels || '';
  const novels = novelsParam
    .split(',')
    .map((n) => sanitizeTitle(decodeURIComponent(n)))
    .filter(Boolean);

  if (!novels.length) {
    return res.status(400).json({ error: '검색할 소설 제목을 입력해주세요.' });
  }

  // Limit max novels per request
  if (novels.length > 10) {
    return res.status(400).json({ error: '한 번에 최대 10개 소설만 검색 가능합니다.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    await searchNovels(novels, sendEvent);
    sendEvent({ type: 'done' });
  } catch (err) {
    sendEvent({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
});

/**
 * POST /api/search
 * Standard JSON response (non-streaming fallback)
 */
router.post('/search', async (req, res) => {
  const novels = (req.body.novels || []).map((n) => n.trim()).filter(Boolean);
  if (!novels.length) {
    return res.status(400).json({ error: '검색할 소설 제목을 입력해주세요.' });
  }
  try {
    const results = await searchNovels(novels, null);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

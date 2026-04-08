'use strict';

const express = require('express');
const { searchAndSummarizeReviews } = require('../reviews/summarize');

const router = express.Router();

/**
 * POST /api/review/search
 * Body: { novelTitle }
 * Searches the web for reviews about the novel, then uses AI to generate a comprehensive summary.
 * Returns: { summary }
 */
router.post('/review/search', async (req, res) => {
  const { novelTitle } = req.body;

  if (!novelTitle) {
    return res.status(400).json({ error: '소설 제목이 필요합니다.' });
  }

  try {
    console.log(`[REVIEW_SEARCH] 웹 리뷰 검색 시작: ${novelTitle}`);
    const summary = await searchAndSummarizeReviews(novelTitle);
    console.log(`[REVIEW_SEARCH] 완료: ${novelTitle}`);
    res.json({ summary });
  } catch (err) {
    console.error('[REVIEW_SEARCH_ERROR]', err.message, err.stack);
    res.status(500).json({ error: err.message || '리뷰 요약 실패' });
  }
});

/**
 * POST /api/review/summarize (legacy - keep for backward compatibility)
 */
router.post('/review/summarize', async (req, res) => {
  const { novelTitle, reviews } = req.body;
  if (!novelTitle) {
    return res.status(400).json({ error: '소설 제목이 필요합니다.' });
  }
  try {
    console.log(`[REVIEW_SUMMARIZE] 웹 리뷰 검색 시작: ${novelTitle}`);
    const summary = await searchAndSummarizeReviews(novelTitle);
    res.json({ summary });
  } catch (err) {
    console.error('[REVIEW_SUMMARIZE_ERROR]', err.message, err.stack);
    res.status(500).json({ error: err.message || '리뷰 요약 실패' });
  }
});

module.exports = router;

'use strict';

const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

const VALID_PLATFORMS = ['kakao', 'naver', 'novelpia', 'munpia', 'joara'];

// GET /api/ranking/cached?platform=kakao&limit=100
router.get('/ranking/cached', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'DB not configured' });
  }

  const platform = req.query.platform || 'kakao';
  const limit = Math.min(parseInt(req.query.limit) || 100, 100);

  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: '유효하지 않은 플랫폼입니다.' });
  }

  try {
    const { data, error } = await supabase
      .from('rankings')
      .select('*')
      .eq('platform', platform)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const crawledAt = data.length > 0 ? data[0].crawled_at : null;
    res.json({ platform, items: data || [], crawledAt });
  } catch (err) {
    console.error('[RANKING_CACHE] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ranking/cached/all?limit=3  — single request returning all platforms
router.get('/ranking/cached/all', async (req, res) => {
  if (!supabase) {
    return res.json({ platforms: {} });
  }

  const limit = Math.min(parseInt(req.query.limit) || 3, 100);

  try {
    const { data, error } = await supabase
      .from('rankings')
      .select('*')
      .order('rank', { ascending: true });

    if (error) throw error;

    const platforms = {};
    let crawledAt = null;
    for (const row of (data || [])) {
      if (!platforms[row.platform]) platforms[row.platform] = [];
      if (platforms[row.platform].length < limit) {
        platforms[row.platform].push(row);
      }
      if (!crawledAt) crawledAt = row.crawled_at;
    }

    res.json({ platforms, crawledAt });
  } catch (err) {
    console.error('[RANKING_CACHE_ALL] Error:', err.message);
    res.json({ platforms: {} });
  }
});

// POST /api/ranking/refresh — manual trigger for scheduler
router.post('/ranking/refresh', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'DB not configured' });
  }
  try {
    const { crawlAndStoreRankings } = require('./rankingScheduler');
    res.json({ message: '크롤링을 시작합니다...' });
    crawlAndStoreRankings().catch(e => console.error('[RANKING_REFRESH] Error:', e.message));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

'use strict';

const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

// GET /api/novels/autocomplete?q=검은사제
router.get('/novels/autocomplete', async (req, res) => {
  if (!supabase) {
    return res.json({ results: [] });
  }

  const q = (req.query.q || '').trim().slice(0, 100);
  if (!q) return res.json({ results: [] });

  try {
    const { data, error } = await supabase
      .from('novels')
      .select('title, platform, url, thumbnail')
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Deduplicate by title (keep first occurrence)
    const seen = new Set();
    const results = (data || []).filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    });

    res.json({ results });
  } catch (err) {
    console.error('[NOVELS_AUTOCOMPLETE] Error:', err.message);
    res.json({ results: [] });
  }
});

module.exports = router;

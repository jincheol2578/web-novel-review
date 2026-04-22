'use strict';

const supabase = require('../lib/supabase');

const PLATFORM_KEYS = ['kakao', 'naver', 'novelpia', 'munpia', 'joara'];

async function crawlAndStoreRankings() {
  if (!supabase) {
    console.warn('[SCHEDULER] Supabase not configured, skipping ranking crawl');
    return;
  }

  // Lazy-require to avoid circular deps
  const rankingRouter = require('./ranking');
  const fetchFns = rankingRouter._fetchFns;

  if (!fetchFns) {
    console.warn('[SCHEDULER] fetchFns not exported from ranking.js');
    return;
  }

  console.log('[SCHEDULER] Starting ranking crawl for all platforms...');
  const crawledAt = new Date().toISOString();

  for (const key of PLATFORM_KEYS) {
    const fn = fetchFns[key];
    if (!fn) continue;

    try {
      console.log(`[SCHEDULER] Crawling ${key}...`);
      const items = await fn('전체');

      if (!items || items.length === 0) {
        console.warn(`[SCHEDULER] No items for ${key}`);
        continue;
      }

      // Delete old rankings for this platform
      const { error: delErr } = await supabase
        .from('rankings')
        .delete()
        .eq('platform', key);
      if (delErr) throw delErr;

      // Insert fresh batch
      const rows = items.map(item => ({
        platform: key,
        rank: item.rank,
        title: item.title || '',
        author: item.author || '',
        url: item.url || '',
        thumbnail: item.thumbnail || '',
        rating: item.rating ? String(item.rating) : '',
        rating_count: item.ratingCount ? String(item.ratingCount) : '',
        genre: item.genre || '',
        crawled_at: crawledAt,
      }));

      const { error: insErr } = await supabase.from('rankings').insert(rows);
      if (insErr) throw insErr;

      console.log(`[SCHEDULER] Stored ${rows.length} items for ${key}`);

      // Also upsert titles into novels table
      const novelRows = items.map(item => ({
        title: item.title || '',
        platform: key,
        url: item.url || '',
        thumbnail: item.thumbnail || '',
        updated_at: crawledAt,
      })).filter(r => r.title);

      if (novelRows.length > 0) {
        await supabase.from('novels').upsert(novelRows, {
          onConflict: 'title,platform',
          ignoreDuplicates: false,
        });
      }

      // Small delay between platforms to be polite
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[SCHEDULER] Error crawling ${key}:`, err.message);
    }
  }

  console.log('[SCHEDULER] Ranking crawl complete');
}

module.exports = { crawlAndStoreRankings };

'use strict';

const KakaoCrawler = require('./kakao.crawler');
const NaverCrawler = require('./naver.crawler');
const MunpiaCrawler = require('./munpia.crawler');
const NovelpiaCrawler = require('./novelpia.crawler');
const JoaraCrawler = require('./joara.crawler');

// Define crawlers array before using it
const CRAWLERS = [KakaoCrawler, NaverCrawler, MunpiaCrawler, NovelpiaCrawler, JoaraCrawler];

// Instantiate once, reuse across searches
const CRAWLER_INSTANCES = CRAWLERS.map((C) => new C());

/**
 * Search all platforms for a single novel.
 * Returns array of platform results, one per crawler.
 * Each result either has status:'success' data or status:'error'/'not_found'.
 */
async function searchNovel(novelTitle, onPlatformResult) {
  const tasks = CRAWLER_INSTANCES.map(async (crawler) => {
    try {
      const result = await crawler.search(novelTitle);
      const event = { type: 'platform_result', novelTitle, platform: result };
      if (onPlatformResult) onPlatformResult(event);
      return result;
    } catch (err) {
      console.error(`[SEARCH_ERROR] ${crawler.platformName}:`, err.message, err.stack);
      return {
        platform: crawler.platformName,
        platformKey: crawler.platformKey,
        status: 'error',
        error: err.message || '알 수 없는 오류',
      };
    }
  });

  const results = await Promise.allSettled(tasks);
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const crawler = CRAWLER_INSTANCES[i];
    return {
      platform: crawler.platformName,
      platformKey: crawler.platformKey,
      status: 'error',
      error: r.reason?.message || '알 수 없는 오류',
    };
  });
}

/**
 * Search multiple novels, streaming results via onPlatformResult callback.
 * Processes novels in batches of MAX_CONCURRENT_NOVELS.
 */
async function searchNovels(novelTitles, onPlatformResult) {
  const batchSize = parseInt(process.env.MAX_CONCURRENT_NOVELS || '2', 10);
  const results = [];

  for (let i = 0; i < novelTitles.length; i += batchSize) {
    const batch = novelTitles.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((title) => searchNovel(title, onPlatformResult))
    );
    for (let j = 0; j < batch.length; j++) {
      const r = batchResults[j];
      results.push({
        novelTitle: batch[j],
        platforms: r.status === 'fulfilled' ? r.value : [],
      });
    }
  }

  return results;
}

module.exports = { searchNovels, searchNovel };

'use strict';

const KakaoCrawler = require('./kakao.crawler');
const NaverCrawler = require('./naver.crawler');
const MunpiaCrawler = require('./munpia.crawler');
const NovelpaCrawler = require('./novelpia.crawler');
const JoaraCrawler = require('./joara.crawler');

const CRAWLERS = [
  KakaoCrawler,
  NaverCrawler,
  MunpiaCrawler,
  NovelpaCrawler,
  JoaraCrawler,
];

/**
 * Search all platforms for a single novel.
 * Returns array of platform results, one per crawler.
 * Each result either has status:'success' data or status:'error'/'not_found'.
 */
async function searchNovel(novelTitle, onPlatformResult) {
  const tasks = CRAWLERS.map(async (CrawlerClass) => {
    try {
      const crawler = new CrawlerClass();
      const result = await crawler.search(novelTitle);
      const event = { type: 'platform_result', novelTitle, platform: result };
      if (onPlatformResult) onPlatformResult(event);
      return result;
    } catch (err) {
      console.error(`[SEARCH_ERROR] ${new CrawlerClass().platformName}:`, err.message, err.stack);
      return {
        platform: new CrawlerClass().platformName,
        platformKey: new CrawlerClass().platformKey,
        status: 'error',
        error: err.message || '알 수 없는 오류',
      };
    }
  });

  const results = await Promise.allSettled(tasks);
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      platform: new CRAWLERS[i]().platformName,
      platformKey: new CRAWLERS[i]().platformKey,
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

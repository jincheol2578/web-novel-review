'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

/**
 * Platform ranking crawler base class.
 * Subclasses implement crawl(genre='전체') returning:
 * { platform, platformKey, genre, rank: [{ rank, title, url, genre, author, rating }] }
 */
class RankingCrawler extends BaseCrawler {
  constructor(platformName, platformKey) {
    super(platformName, platformKey);
  }

  async crawl(genre = '전체') {
    throw new Error('crawl() not implemented');
  }
}

module.exports = { RankingCrawler };

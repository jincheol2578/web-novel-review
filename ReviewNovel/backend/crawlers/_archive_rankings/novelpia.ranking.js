'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class NovelpiaRankingCrawler extends BaseCrawler {
  constructor() {
    super('노벨피아', 'novelpia');
    this.genres = {
      '전체': 0,
      '판타지': 1,
      '로맨스': 2,
      '무협': 3,
      '미스터리': 4,
      'SF': 5,
      '기타': 6,
    };
  }

  async crawl(genre = '전체') {
    const apiUrl = `https://novelpia.com/ranking`;

    const html = await this.fetchHtml(apiUrl);
    const $ = cheerio.load(html);

    const items = [];

    // Look for ranking items
    $('.ranking-list > li, .rank-list > li, ol.rank > li, ul.rank > li, [class*="rank"] li').each((i, el) => {
      if (i >= 10) return;
      const $el = $(el);
      const title = $el.find('a[href*="/novel/"]').first().text().trim();
      const href = $el.find('a[href*="/novel/"]').first().attr('href') || '';
      const author = $el.find('.author, .writer, [class*="author"], [class*="writer"]').first().text().trim();
      const rating = $el.find('.score, .rating, .point, [class*="point"], [class*="score"]').first().text().trim();

      if (title) {
        items.push({
          rank: i + 1,
          title,
          url: href.startsWith('http') ? href : `https://novelpia.com${href}`,
          genre: genre,
          author,
          rating,
          ratingCount: '',
          thumbnail: '',
        });
      }
    });

    return {
      platform: this.platformName,
      platformKey: this.platformKey,
      genre,
      rank: items.slice(0, 10),
    };
  }
}

module.exports = NovelpiaRankingCrawler;

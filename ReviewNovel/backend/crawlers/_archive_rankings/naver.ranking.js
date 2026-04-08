'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class NaverRankingCrawler extends BaseCrawler {
  constructor() {
    super('네이버 시리즈', 'naver');
    this.genres = {
      '전체': 0,
      '로맨스': 1,
      '판타지': 2,
      '무협': 3,
      '현대': 4,
    };
  }

  async crawl(genre = '전체') {
    // Try the ranking page
    const url = 'https://series.naver.com/ranking.nhn';
    const html = await this.fetchHtml(url);

    if (html.includes('자동화된') || html.includes('로봇') || html.includes('차단')) {
      throw new Error('네이버 봇 감지');
    }

    const $ = cheerio.load(html);
    const items = [];

    // Naver ranking uses various selectors depending on page structure
    // Try multiple approaches
    const selectors = [
      'ol.rank_lst li',
      'ol.OLlst li',
      '.ranking_list li',
      '.rank li',
      'ul.rank_lst li',
    ];

    for (const selector of selectors) {
      $(selector).each((i, el) => {
        if (i >= 10) return;
        const $el = $(el);
        const titleEl = $el.find('a[href*="productNo"], strong, .tit').first();
        const title = titleEl.text().trim();
        const href = $el.find('a[href*="productNo"]').first().attr('href') || '';
        const rating = $el.find('em.score_num, .score').first().text().trim();

        if (title) {
          items.push({
            rank: items.length + 1,
            title,
            url: href.startsWith('http') ? href : `https://series.naver.com${href}`,
            genre: genre,
            author: $(el).find('.name, .author, em.author').first().text().trim(),
            rating,
            ratingCount: '',
            thumbnail: '',
          });
        }
      });

      if (items.length > 0) break;
    }

    return {
      platform: this.platformName,
      platformKey: this.platformKey,
      genre,
      rank: items.slice(0, 10),
    };
  }
}

module.exports = NaverRankingCrawler;

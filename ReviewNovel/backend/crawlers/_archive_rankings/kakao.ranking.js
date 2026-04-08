'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class KakaoRankingCrawler extends BaseCrawler {
  constructor() {
    super('카카오페이지', 'kakao');
    // Kakao uses category UID for ranking
    // The ranking API is similar to search but with ranking endpoint
    this.genres = { '전체': 0, '로맨스': 11, '판타지': 4, '로맨스판타지': 31, '무협': 6, '현대판타지': 5 };
  }

  async crawl(genre = '전체') {
    const genreCode = this.genres[genre] ?? 0;
    // Try the BFF gateway ranking endpoint (same auth as search)
    const apiUrl = `https://bff-page.kakao.com/api/gateway/api/v1/ranking/weeknovel?category_uid=${genreCode}&size=14`;

    const data = await this.fetchJson(apiUrl, {
      headers: {
        'Origin': 'https://page.kakao.com',
        'Referer': 'https://page.kakao.com/ranking/novel?category=4',
      },
    });

    const items = [];
    // Try various response structures
    let list = [];

    if (data.result?.list) list = data.result.list;
    else if (data.list) list = data.list;
    else if (data.result?.ranking_info?.list) list = data.result.ranking_info.list;
    else if (data.result?.series_list) list = data.result.series_list;

    if (Array.isArray(list)) {
      list.forEach((item, i) => {
        if (i >= 10) return;
        const seriesId = item.series_id || item.id;
        const title = item.title || item.series_title || item.name;
        if (seriesId && title) {
          items.push({
            rank: i + 1,
            title,
            url: `https://page.kakao.com/content/${seriesId}`,
            genre: item.category1_name || item.category2_name || item.category_name || genre,
            author: item.author || item.authors || '',
            rating: (item.star_score || '').toString(),
            ratingCount: (item.view_count || item.service_property?.view_count || '').toString(),
            thumbnail: '',
          });
        }
      });
    }

    // Fallback: try scraping the ranking page
    if (items.length === 0) {
      try {
        const html = await this.fetchHtml(`https://page.kakao.com/ranking/novel?category=${genreCode}`);
        const $ = cheerio.load(html);
        // Look for ranking items
        $('a[href*="/content/"]').each((i, el) => {
          if (i >= 10) return;
          const title = $(el).find('span, .tit, .title').first().text().trim() || $(el).text().trim();
          const href = $(el).attr('href') || '';
          if (title) {
            // Extract series_id from URL like /content/123456
            const match = href.match(/\/content\/(\d+)/);
            items.push({
              rank: items.length + 1,
              title,
              url: href.startsWith('http') ? href : `https://page.kakao.com${href}`,
              genre: genre,
              author: '',
              rating: '',
              ratingCount: '',
              thumbnail: '',
            });
          }
        });
      } catch (e) {
        console.warn('[KAKAO_RANKING] Scraping fallback failed:', e.message);
      }
    }

    return {
      platform: this.platformName,
      platformKey: this.platformKey,
      genre,
      rank: items.slice(0, 10),
    };
  }
}

module.exports = KakaoRankingCrawler;

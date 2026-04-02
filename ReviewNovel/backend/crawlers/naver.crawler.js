'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class NaverCrawler extends BaseCrawler {
  constructor() {
    super('네이버 시리즈', 'naver');
  }

  async crawl(novelTitle) {
    const searchUrl = `https://series.naver.com/search/search.series?t=novel&q=${encodeURIComponent(novelTitle)}`;
    const searchHtml = await this.fetchHtml(searchUrl);

    await sleep(800 + Math.random() * 600);

    // 보안 체크
    if (searchHtml.includes('자동화된') || searchHtml.includes('로봇') || searchHtml.includes('차단')) {
      const err = new Error('네이버 봇 감지');
      err.status = 'error';
      throw err;
    }

    const $ = cheerio.load(searchHtml);
    const items = [];
    $('h3 a[href*="productNo"], a[href*="productNo"]').slice(0, 10).each((i, el) => {
      const $el = $(el);
      const rawTitle = $el.text().trim();
      const title = rawTitle.replace(/\s*\(총\s*\d+화.*?\)\s*$/, '').trim();
      const href = $el.attr('href');
      const $li = $el.closest('li');
      const score = $li.find('em.score_num').first().text().trim() || '';

      if (title && href) {
        items.push({ title, href, score });
      }
    });

    if (!items.length) throw this.notFound();

    const best = this.findBest(novelTitle, items, (i) => i.title);
    if (!best) throw this.notFound();

    const matchedTitle = best.title;
    const novelUrl = best.href.startsWith('http')
      ? best.href
      : `https://series.naver.com${best.href}`;
    const rating = best.score || '';

    // 상세 페이지
    await sleep(500);
    const detailHtml = await this.fetchHtml(novelUrl);
    const $detail = cheerio.load(detailHtml);

    const ratingCount = $detail('.score_area .count, [class*="ratingCount"]').first().text().trim() || '';
    const downloadCount = $detail('.btn_download span, a.btn_download span, button.btn_download span').first().text().trim() || '';

    // 리뷰
    let reviews = [];
    $detail('.review_list li, [class*="ReviewItem"], .comment_list li').slice(0, 3).each((i, el) => {
      const $el = $detail(el);
      const text = ($el.find('p, .text, .content').first().text() || $el.text()).trim().slice(0, 200);
      const author = $el.find('.author, .user_nick, [class*="author"]').first().text().trim() || '';
      const date = $el.find('.date, time, [class*="date"]').first().text().trim() || '';
      if (text) {
        reviews.push({ text, author, date, url: novelUrl });
      }
    });

    // 썸네일 (og:image)
    let thumbnail = '';
    const ogImage = $detail('meta[property="og:image"]').attr('content');
    if (ogImage) {
      thumbnail = ogImage.replace(/&amp;/g, '&');
    }

    return { 
      matchedTitle, 
      url: novelUrl, 
      rating, 
      ratingCount, 
      downloadCount, 
      thumbnail,
      reviews 
    };
  }
}

module.exports = NaverCrawler;

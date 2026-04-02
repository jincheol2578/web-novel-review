'use strict';

console.log('[INIT] Loading munpia.crawler...');
const { BaseCrawler, sleep } = require('./base.crawler');
console.log('[INIT] BaseCrawler loaded');
const cheerio = require('cheerio');
console.log('[INIT] cheerio loaded, type:', typeof cheerio);

class MunpiaCrawler extends BaseCrawler {
  constructor() {
    super('문피아', 'munpia');
  }

  async crawl(novelTitle) {
    console.log('[CRAWL] Starting munpia crawl for:', novelTitle);
    // 검색
    const searchUrl = `https://novel.munpia.com/page/hd.platinum/view/search/keyword/${encodeURIComponent(novelTitle)}/order/search_result`;
    console.log('[CRAWL-DEBUG] About to fetch:', searchUrl);
    const searchHtml = await this.fetchHtml(searchUrl, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    console.log('[CRAWL-DEBUG] Fetched HTML, length:', searchHtml.length);

    console.log('[DEBUG] munpia cheerio type:', typeof cheerio, 'cheerio.load type:', typeof cheerio.load);
    console.log('[CRAWL-DEBUG] About to call cheerio.load');
    const $search = cheerio.load(searchHtml);
    console.log('[CRAWL-DEBUG] cheerio.load succeeded');
    const items = [];
    $search('a.title[href*="novel.munpia.com"]').each((i, el) => {
      if (i >= 10) return;
      const $el = $search(el);
      const title = $el.text().trim();
      const href = $el.attr('href');
      if (title && href) {
        items.push({ title, href });
      }
    });

    if (!items.length) throw this.notFound();

    const best = this.findBest(novelTitle, items, (i) => i.title);
    if (!best) throw this.notFound();

    const matchedTitle = best.title;
    const novelUrl = best.href.startsWith('http')
      ? best.href
      : `https://novel.munpia.com${best.href}`;

    // 상세 페이지
    await sleep(300);
    const detailHtml = await this.fetchHtml(novelUrl, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    const $detail = cheerio.load(detailHtml);

    // 추천수
    let rating = '';
    $detail('.meta-etc dt').each((i, el) => {
      const $dt = $detail(el);
      if ($dt.text().includes('추천수')) {
        rating = $dt.next('dd').text().trim();
      }
    });

    // 선호작수
    const ratingCount = $detail('span.text b').first().text().trim() || '';

    // 리뷰
    let reviews = [];
    $detail('.comment-list li, .cmt_list li, [class*="comment"] li').slice(0, 3).each((i, el) => {
      const $el = $detail(el);
      const text = ($el.find('p, .text, .content, .cmt-text').first().text() || $el.text()).trim().slice(0, 200);
      const author = $el.find('.author, .nick, [class*="author"]').first().text().trim() || '';
      const date = $el.find('.date, time').first().text().trim() || '';
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
      thumbnail,
      genre: [],
      reviews 
    };
  }
}

module.exports = MunpiaCrawler;

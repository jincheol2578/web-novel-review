'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class JoaraCrawler extends BaseCrawler {
  constructor() {
    super('조아라', 'joara');
  }

  async crawl(novelTitle) {
    // API 사용
    const apiUrl = `https://api.joara.com/v2/search/query?api_key=mw_8ba234e7801ba288554ca07ae44c7188&ver=3.2.0&device=mw&deviceuid=96e10d445a2fee182478bcf9f5299cd781335f9b0e271f7131f5a764120f82c7&devicetoken=mw&query=${encodeURIComponent(novelTitle)}&page=1&offset=20&store=all&target=subject&age_constrict=all&chk_finish=&category=0&min_chapter=&max_chapter=&interval=&orderby=score&except_query=&except_target=&with_target_count=1&enable_fallback_match=false`;

    const searchJson = await this.fetchJson(apiUrl);

    const items = [];
    if (searchJson.data && Array.isArray(searchJson.data.list)) {
      searchJson.data.list.forEach((item) => {
        if (item.book_code && item.subject) {
          items.push({
            title: item.subject,
            bookCode: item.book_code,
            recommendCount: item.recommend_count,
            favoriteCount: item.favorite_count,
            thumbnail: item.cover || '',
            category: item.category_name || '',
            author: item.member_name ? item.member_name.replace(/\[\[|\]\]/g, '') : '',
            genre: item.keyword || [],
            isComplete: item.chkfinish === true,
            totalChapter: item.total_chapter_count || 0,
          });
        }
      });
    }

    if (!items.length) throw this.notFound();

    const best = this.findBest(novelTitle, items, (i) => i.title);
    if (!best) throw this.notFound();

    const matchedTitle = best.title;
    const novelUrl = `https://www.joara.com/book/${best.bookCode}`;
    const rating = best.recommendCount ? String(best.recommendCount) : '';
    const ratingCount = best.favoriteCount ? String(best.favoriteCount) : '';

    // 리뷰 추출 (상세 페이지에서)
    await sleep(1500);
    const detailHtml = await this.fetchHtml(novelUrl);
    const $detail = cheerio.load(detailHtml);

    let reviews = [];
    $detail('[class*="ReviewItem"], [class*="review_item"], .review_list li').slice(0, 3).each((i, el) => {
      const $el = $detail(el);
      const text = ($el.find('p, .text, [class*="content"]').first().text() || $el.text()).trim().slice(0, 200);
      const author = $el.find('[class*="author"], [class*="nick"], .user_name').first().text().trim() || '';
      const date = $el.find('[class*="date"], time').first().text().trim() || '';
      if (text) {
        reviews.push({ text, author, date, url: novelUrl });
      }
    });

    return {
      matchedTitle,
      url: novelUrl,
      thumbnail: best.thumbnail,
      rating,
      ratingCount,
      category: best.category,
      author: best.author,
      genre: best.genre,
      isComplete: best.isComplete,
      totalChapter: best.totalChapter,
      reviews,
    };
  }
}

module.exports = JoaraCrawler;

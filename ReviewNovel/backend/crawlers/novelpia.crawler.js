'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class NovelpaCrawler extends BaseCrawler {
  constructor() {
    super('노벨피아', 'novelpia');
  }

  async crawl(novelTitle) {
    // API 사용
    const apiUrl = `https://novelpia.com/proc/novel?cmd=novel_search&page=1&rows=30&search_type=all&search_val=${encodeURIComponent(novelTitle)}&novel_type=&start_count_book=&end_count_book=&novel_age=&start_days=&sort_col=count_good&novel_genre=&block_out=0&block_stop=0&is_contest=0&is_complete=&is_challenge=0&list_display=list`;

    const searchJson = await this.fetchJson(apiUrl);

    const items = [];
    if (searchJson.list && Array.isArray(searchJson.list)) {
      searchJson.list.forEach((item) => {
        if (item.novel_no && item.novel_name) {
          items.push({
            title: item.novel_name,
            novelNo: item.novel_no,
            count_good: item.count_good,
            count_view: item.count_view,
            genre: item.novel_genre_arr || [],
            writer: item.writer_nick || '',
            isComplete: item.is_complete === 1,
            coverUrl: item.cover_url || '',
          });
        }
      });
    }

    if (!items.length) throw this.notFound();

    const best = this.findBest(novelTitle, items, (i) => i.title);
    if (!best) throw this.notFound();

    const matchedTitle = best.title;
    const novelUrl = `https://novelpia.com/novel/${best.novelNo}`;
    const rating = best.count_good ? String(best.count_good) : '';
    const ratingCount = best.count_view ? String(best.count_view) : '';

    // 리뷰 추출 (상세 페이지에서)
    await sleep(2000);
    const detailHtml = await this.fetchHtml(novelUrl);
    const $detail = cheerio.load(detailHtml);

    let reviews = [];
    $detail('#comment_list_box .comment_header, [class*="comment_item"]').slice(0, 3).each((i, el) => {
      const $el = $detail(el);
      const text = ($el.find('.comment_re, p, .text').first().text() || $el.text()).trim().slice(0, 200);
      const author = $el.find('[class*="nick"], [class*="author"]').first().text().trim() || '';
      const date = $el.find('[class*="date"], time').first().text().trim() || '';
      if (text) {
        reviews.push({ text, author, date, url: novelUrl });
      }
    });

    // 썸네일 - og:image에서도 가져오기
    let thumbnail = best.coverUrl;
    if (!thumbnail) {
      const ogImage = $detail('meta[property="og:image"]').attr('content');
      if (ogImage) {
        thumbnail = ogImage;
      }
    }

    return {
      matchedTitle,
      url: novelUrl,
      thumbnail,
      rating,
      ratingCount,
      genre: best.genre,
      author: best.writer,
      isComplete: best.isComplete,
      reviews,
    };
  }
}

module.exports = NovelpaCrawler;

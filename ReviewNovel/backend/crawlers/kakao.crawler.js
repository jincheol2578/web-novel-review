'use strict';

const { BaseCrawler, sleep } = require('./base.crawler');
const cheerio = require('cheerio');

class KakaoCrawler extends BaseCrawler {
  constructor() {
    super('카카오페이지', 'kakao');
  }

  async crawl(novelTitle) {
    // BFF API 사용
    const apiUrl = `https://bff-page.kakao.com/api/gateway/api/v1/search/series?keyword=${encodeURIComponent(novelTitle)}&category_uid=0&is_complete=false&sort_type=ACCURACY&page=0&size=25`;

    const searchJson = await this.fetchJson(apiUrl, {
      headers: {
        'Origin': 'https://page.kakao.com',
        'Referer': 'https://page.kakao.com/',
      },
    });

    const items = [];
    if (searchJson.result && Array.isArray(searchJson.result.list)) {
      searchJson.result.list.forEach((item) => {
        if (item.series_id && item.title) {
          items.push({
            title: item.title,
            seriesId: item.series_id,
            category: item.category || '',
            subCategory: item.sub_category || '',
            authors: item.authors || '',
            thumbnail: item.thumbnail || '',
            viewCount: item.service_property?.view_count || 0,
          });
        }
      });
    }

    if (!items.length) throw this.notFound();

    const best = this.findBest(novelTitle, items, (i) => i.title);
    if (!best) throw this.notFound();

    const matchedTitle = best.title;
    const novelUrl = `https://page.kakao.com/content/${best.seriesId}`;

    // 썸네일 URL 구성
    let thumbnail = '';
    if (best.thumbnail) {
      thumbnail = `https://page-images.kakaoentcdn.com/download/resource?kid=${best.thumbnail}&filename=th`;
    }

    // 상세 페이지에서 별점 추출
    await sleep(1000);
    const detailHtml = await this.fetchHtml(novelUrl);
    const $detail = cheerio.load(detailHtml);

    // og:image 메타태그에서 썸네일 가져오기
    if (!thumbnail) {
      const ogImage = $detail('meta[property="og:image"]').attr('content');
      if (ogImage) {
        thumbnail = ogImage.replace(/&amp;/g, '&');
      }
    }

    // 별점
    let rating = '';
    const starImg = $detail('img[alt="별점"]');
    if (starImg.length) {
      const span = starImg.closest('div').find('span').first();
      rating = span.text().trim() || '';
    }

    // 조회수
    let ratingCount = '';
    const viewImg = $detail('img[alt="조회수"], img[alt="views"]');
    if (viewImg.length) {
      const span = viewImg.closest('div').find('span').first();
      ratingCount = span.text().trim() || '';
    }
    if (!ratingCount) {
      const allSpans = $detail('span.text-el-70.opacity-70');
      if (allSpans.length > 1) {
        ratingCount = allSpans.eq(1).text().trim() || '';
      }
    }

    // 리뷰
    let reviews = [];
    $detail('[class*="CommentItem"], [class*="ReviewItem"], [class*="comment_item"]').slice(0, 3).each((i, el) => {
      const $el = $detail(el);
      const text = ($el.find('p, span, div').first().text() || $el.text()).trim().slice(0, 200);
      const author = $el.find('[class*="author"], [class*="user"], [class*="nick"]').first().text().trim() || '';
      const date = $el.find('[class*="date"], time').first().text().trim() || '';
      if (text) {
        reviews.push({ text, author, date, url: novelUrl });
      }
    });

    return {
      matchedTitle,
      url: novelUrl,
      thumbnail,
      rating,
      ratingCount,
      category: best.category,
      subCategory: best.subCategory,
      authors: best.authors,
      genre: [best.category, best.subCategory].filter(Boolean),
      reviews,
    };
  }
}

module.exports = KakaoCrawler;

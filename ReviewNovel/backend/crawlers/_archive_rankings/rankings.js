'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const TIMEOUT = parseInt(process.env.CRAWL_TIMEOUT_MS || '15000', 10);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/**
 * Fetch rankings from multiple platforms
 * Returns: { platform, genre, novels: [{ rank, title, author, rating, thumbnail, url, views }] }
 */

// ---- KakaoPage Rankings ----
async function fetchKakaoRankings(genre = 'total', limit = 10) {
  try {
    // Kakao uses genre codes: total=0, 판타지=500004, 로맨스판타지=500026, 무협=500009, 현대판타지=500011, 로맨스=500005, BL=502550, 등
    const genreMap = {
      'total': '0',
      '판타지': '500004',
      '로맨스판타지': '500026',
      '무협': '500009',
      '로맨스': '500005',
      '현대판타지': '500011',
      'BL': '502550',
      '순정만화': '500006',
      '일반만화': '500008',
    };

    const categoryUid = genreMap[genre] || '0';
    const apiUrl = `https://bff-page.kakao.com/api/gateway/api/v1/search/series?keyword=&category_uid=${categoryUid}&is_complete=false&sort_type=POPULARITY&page=0&size=${limit}`;

    const { data } = await axios.get(apiUrl, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://page.kakao.com',
        'Referer': 'https://page.kakao.com/',
        'Accept': 'application/json',
      },
    });

    if (!data.result || !Array.isArray(data.result.list)) {
      return [];
    }

    return data.result.list.slice(0, limit).map((item, i) => ({
      rank: i + 1,
      title: item.title || '제목 없음',
      author: item.authors || '',
      category: item.sub_category || item.category || '',
      views: item.service_property?.view_count || 0,
      thumbnail: item.thumbnail ? `https://page-images.kakaoentcdn.com/download/resource?kid=${item.thumbnail}&filename=th` : '',
      url: `https://page.kakao.com/content/${item.series_id}`,
    }));
  } catch (err) {
    console.error('[RANKINGS] Kakao error:', err.message);
    return [];
  }
}

// ---- Novelpia Rankings ----
async function fetchNovelpiaRankings(genre = 'total', limit = 10) {
  try {
    const genreMap = {
      'total': '0',
      '판타지': '1',
      '로맨스판타지': '9',
      '무협': '2',
      '현대판타지': '3',
      '로맨스': '4',
      'BL': '8',
      '순정': '10',
    };

    const genreId = genreMap[genre] || '0';
    const apiUrl = `https://novelpia.com/proc/novel?cmd=novel_search&page=1&rows=${limit}&search_type=all&search_val=&novel_type=&start_count_book=&end_count_book=&novel_age=${genreId}&start_days=&sort_col=count_good&novel_genre=&block_out=0&block_stop=0&is_contest=0&is_complete=&is_challenge=0&list_display=list`;

    const { data } = await axios.post(apiUrl, {}, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://novelpia.com',
        'Referer': 'https://novelpia.com/',
        'Content-Type': 'application/json',
      },
    });

    if (!data.list || !Array.isArray(data.list)) {
      return [];
    }

    return data.list.slice(0, limit).map((item, i) => ({
      rank: i + 1,
      title: item.novel_name || '제목 없음',
      author: item.writer_nick || '',
      category: item.genre_name || '',
      views: item.count_view || 0,
      likes: item.count_good || 0,
      thumbnail: item.cover_url || '',
      url: `https://novelpia.com/novel/${item.novel_no}`,
    }));
  } catch (err) {
    console.error('[RANKINGS] Novelpia error:', err.message);
    return [];
  }
}

// ---- Munpia Rankings ----
async function fetchMunpiaRankings(genre = 'total', limit = 10) {
  try {
    // Munpia ranking page scraping
    const genreMap = {
      'total': '0',
      '판타지': '1',
      '무협': '2',
      '로맨스': '3',
      '로맨스판타지': '4',
      '현대판타지': '5',
      'BL': '6',
      '추리미스터리': '7',
    };

    const genreId = genreMap[genre] || '0';
    const url = `https://novel.munpia.com/page/hd.platinum/view/rank/view/period/total/gender/male/genre/${genreId}/type/charge/`;

    const { data: html } = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://novel.munpia.com/',
        'Accept': 'text/html',
      },
    });

    const $ = cheerio.load(html);
    const novels = [];

    $('.rank_list .rank_item, .rank-list .rank-item, table tbody tr').each((i, el) => {
      if (novels.length >= limit) return false;
      const $el = $(el);
      const titleEl = $el.find('a[href*="view"]').first();
      const title = titleEl.text().trim();
      const url = titleEl.attr('href') || '';
      const author = ($el.find('.name, .author, .writer').first().text() || '').trim();

      if (title && title.length > 1) {
        novels.push({
          rank: novels.length + 1,
          title,
          author,
          category: genre,
          url: url.startsWith('http') ? url : `https://novel.munpia.com${url}`,
        });
      }
    });

    return novels;
  } catch (err) {
    console.error('[RANKINGS] Munpia error:', err.message);
    return [];
  }
}

// ---- Naver Series Rankings ----
async function fetchNaverRankings(genre = 'total', limit = 10) {
  try {
    const genreMap = {
      'total': 'ALL',
      '판타지': 'FANTASY',
      '로맨스판타지': 'FANTASY_ROMANCE',
      '무협': 'MARTIAL_ARTS',
      '로맨스': 'ROMANCE',
      '현대판타지': 'MODERN_FANTASY',
      'BL': 'BL',
    };

    const genreCode = genreMap[genre] || 'ALL';
    // Naver Series has a public API
    const apiUrl = `https://series.naver.com/novel/categoryRanking.series?categoryGenreCode=${genreCode}&rankingMonth=&size=${limit}`;

    const { data } = await axios.get(apiUrl, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://series.naver.com',
        'Referer': 'https://series.naver.com/',
        'Accept': 'application/json',
      },
    });

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.slice(0, limit).map((item, i) => ({
      rank: i + 1,
      title: item.name || item.title || '제목 없음',
      author: item.authorName || item.author || '',
      category: item.genreName || item.categoryName || '',
      views: item.readCount || item.viewCount || 0,
      rating: item.rating || '',
      thumbnail: item.thumbnailImageUrl || item.image || '',
      url: `https://series.naver.com/novel/${item.productNo}`,
    }));
  } catch (err) {
    console.error('[RANKINGS] Naver error:', err.message);
    return [];
  }
}

// ---- Joara Rankings ----
async function fetchJoaraRankings(genre = 'total', limit = 10) {
  try {
    const genreMap = {
      'total': 'all',
      '판타지': 'fantasy',
      '로맨스판타지': 'romance',
      '무협': 'martial',
      '미스터리': 'mystery',
      'BL': 'bl',
    };

    const genreCode = genreMap[genre] || 'all';
    const url = `https://www.joara.com/rank/${genreCode}.html?rank_type=w`;

    const { data: html } = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://www.joara.com/',
        'Accept': 'text/html',
      },
    });

    const $ = cheerio.load(html);
    const novels = [];

    $('.rank_list li, .ranking-list li, .rank-item').each((i, el) => {
      if (novels.length >= limit) return false;
      const $el = $(el);
      const titleEl = $el.find('a').first();
      const title = titleEl.text().trim();
      const url = titleEl.attr('href') || '';
      const author = ($el.find('.author, .writer, .name').first().text() || '').trim();

      if (title && title.length > 1) {
        novels.push({
          rank: novels.length + 1,
          title,
          author,
          category: genre,
          url: url.startsWith('http') ? url : `https://www.joara.com${url}`,
        });
      }
    });

    return novels;
  } catch (err) {
    console.error('[RANKINGS] Joara error:', err.message);
    return [];
  }
}

// ---- Platform registry ----
const PLATFORM_FETCHERS = {
  kakao: { name: '카카오페이지', fetch: fetchKakaoRankings },
  navers: { name: '네이버시리즈', fetch: fetchNaverRankings },
  munpia: { name: '문피아', fetch: fetchMunpiaRankings },
  novelpia: { name: '노벨피아', fetch: fetchNovelpiaRankings },
  joara: { name: '조아라', fetch: fetchJoaraRankings },
};

const ALL_GENRES = ['total', '판타지', '로맨스판타지', '무협', '로맨스', '현대판타지', 'BL'];

module.exports = {
  PLATFORM_FETCHERS,
  ALL_GENRES,
  fetchKakaoRankings,
  fetchNovelpiaRankings,
  fetchMunpiaRankings,
  fetchNaverRankings,
  fetchJoaraRankings,
};

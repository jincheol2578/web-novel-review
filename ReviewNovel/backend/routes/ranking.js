'use strict';

const https = require('https');
const http = require('http');
const express = require('express');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

console.log('[RANKING] Loaded SSR+fallback version');

// ── HTTP Request Helper ──
function makeRequest(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const lib = parsed.protocol === 'https:' ? https : http;
    const isPost = opts.method === 'POST';
    const headers = {
      'User-Agent': UA,
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      ...opts.headers,
    };
    if (!isPost) headers.Accept = opts.accept || 'text/html';
    if (headers['Content-Type'] && headers['Content-Type'].includes('application/json')) {
      headers.Accept = opts.accept || 'application/json';
    }

    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: isPost ? 'POST' : 'GET',
      headers,
      timeout: 25000,
    };
    if (opts.cookie) reqOpts.headers.Cookie = opts.cookie;

    const req = lib.request(reqOpts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return makeRequest(res.headers.location, opts).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} from ${parsed.hostname}`));
        }
        if (opts.json) {
          try { resolve(JSON.parse(raw)); }
          catch (e) {
            console.error(`[JSON PARSE] ${url}:`, raw.slice(0, 300));
            reject(new Error(`Invalid JSON: ${e.message}`));
          }
        } else { resolve(raw); }
      });
    });
    req.on('error', (e) => reject(new Error(`${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout 25s')); });
    if (isPost && opts.body) req.write(opts.body);
    req.end();
  });
}

function getJson(url, headers = {}) {
  return makeRequest(url, { json: true, accept: 'application/json', headers });
}

function getHtml(url, headers = {}) {
  return makeRequest(url, { accept: 'text/html, */*', headers });
}

function postForm(url, body, headers = {}) {
  const params = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return makeRequest(url, {
    method: 'POST',
    body: params,
    json: true,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      ...headers,
    },
  });
}

function postJson(url, body, headers = {}) {
  return makeRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    json: true,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// Safe wrapper — catches errors, returns structured result
function safeRank(fn, name) {
  return fn().then((rank) => ({
    platform: name.platform,
    platformKey: name.key,
    genre: '인기',
    rank,
  })).catch((err) => ({
    platform: name.platform,
    platformKey: name.key,
    genre: '인기',
    rank: [],
    error: err.message || 'Unknown',
  }));
}

// Kakao genre UID mapping
const KAKAO_GENRES = {
  '전체': 0, '로맨스': 11, '판타지': 4, '로맨스판타지': 31, '무협': 6,
  '현대판타지': 5, '미스터리': 14, 'SF': 15, '기타': 0,
};

// ═══════════════════════════════════════════════════════════
//  1. KAKAOPAGE — page.kakao.com
// ═══════════════════════════════════════════════════════════
async function fetchKakaoRanking(genre = '전체') {
  const gCode = KAKAO_GENRES[genre] ?? 0;

  // Primary: SSR data from __NEXT_DATA__
  try {
    const html = await getHtml(`https://page.kakao.com/menu/10000/screen/48?category_uid=${gCode}`, {
      Origin: 'https://page.kakao.com',
      Referer: 'https://page.kakao.com/',
    });
    console.log('[KAKAO] Fetched HTML length:', html.length);

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]*)<\/script>/s);
    if (!nextDataMatch) {
      throw new Error('__NEXT_DATA__ not found');
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const queries = nextData?.props?.pageProps?.initialProps?.dehydratedState?.queries;
    if (!queries) {
      throw new Error('dehydratedState.queries not found');
    }

    const rankingQuery = queries.find(q => {
      const sections = q?.state?.data?.sections;
      return sections?.some(s => s.type === 'LandingRanking');
    });

    if (!rankingQuery) {
      throw new Error('LandingRanking section not found');
    }

    const rankingSection = rankingQuery.state.data.sections.find(s => s.type === 'LandingRanking');
    if (!rankingSection) {
      throw new Error('LandingRanking section data missing');
    }

    console.log(`[KAKAO] groups count: ${rankingSection.groups?.length}`);
    const items = [];
    for (const group of rankingSection.groups) {
      const groupItems = group.items || [];
      console.log(`[KAKAO] group type=${group.type} items=${groupItems.length}`);
      for (const item of groupItems) {
        // Accept any item with title and rank (CardView, PosterView, etc.)
        if (!item.title || !item.rank) continue;

        // Extract seriesId from scheme or id
        let seriesId = '';
        const schemeMatch = item.scheme?.match(/series_id=(\d+)/);
        if (schemeMatch) {
          seriesId = schemeMatch[1];
        } else {
          // Patterns: "RankingCardViewItem-68723295-1-0" or "RankingPosterView-itemSeries-68723295-..."
          const idMatch = item.id.match(/(?:CardViewItem|PosterView-itemSeries?)-?(\d+)/);
          if (idMatch) seriesId = idMatch[1];
        }

        const rank = parseInt(item.rank) || 0;
        if (rank < 1 || rank > 100) continue; // sanity

        items.push({
          rank,
          title: item.title,
          url: seriesId ? `https://page.kakao.com/content/${seriesId}` : '',
          author: item.author || item.writer || '',
          rating: item.service_property?.star_score || item.starScore || item.star_score || item.score || '',
          ratingCount: item.service_property?.view_count || item.viewCount || item.view_count || '',
          thumbnail: item.thumbnail ? (item.thumbnail.startsWith('//') ? 'https:' + item.thumbnail : item.thumbnail) : '',
          category: item.eventLog?.eventMeta?.subcategory || '',
          badgeList: item.badgeList || [],
          ageGrade: item.ageGrade || '',
        });
      }
    }

    console.log(`[KAKAO] extracted ${items.length} items after filtering`);

    if (items.length > 0) {
      console.log(`[KAKAO] SSR parse — ${items.length} items from category_uid=${gCode}`);
      return items.slice(0, 100).sort((a, b) => a.rank - b.rank);
    }
    console.warn('[KAKAO] SSR parse succeeded but no items, falling back');
    throw new Error('No items from SSR');
  } catch (e) {
    console.warn('[KAKAO] SSR parse failed, falling back:', e.message);
  }

  // Fallback: BFF API + HTML scraping
  const kakaoApis = [
    `https://bff-page.kakao.com/api/gateway/api/v1/ranking/home?genre=${gCode}&period=WEEKLY&size=100`,
    `https://bff-page.kakao.com/api/gateway/api/v1/search/series?keyword=&category_uid=${gCode}&is_complete=false&sort_type=POPULARITY&page=0&size=100`,
    `https://bff-page.kakao.com/api/gateway/api/v1/ranking/list?genre=${gCode}&period=TOTAL&size=100`,
  ];

  for (const apiUrl of kakaoApis) {
    try {
      const data = await getJson(apiUrl, {
        Origin: 'https://page.kakao.com',
        Referer: 'https://page.kakao.com/rank',
      });
      let list = data.result?.list || data.list || data.data?.list || data.contents || data.items || [];
      if (!Array.isArray(list) && data.result && typeof data.result === 'object') {
        list = data.result.data?.list || data.result.result?.list || [];
      }
      if (!Array.isArray(list) && Array.isArray(data.result)) {
        list = data.result;
      }
      if (Array.isArray(list) && list.length > 0) {
        return list.slice(0, 100).map((item, i) => ({
          rank: i + 1,
          title: item.title || item.seriesTitle || item.series_title || item.name || '',
          url: `https://page.kakao.com/content/${item.series_id || item.seriesId || item.contentId || item.id || ''}`,
          genre: item.category?.name || item.category1_name || item.genre || item.category || '',
          author: item.authors || item.author || item.authorName || '',
          rating: (item.service_property?.star_score || item.starScore || item.star_score || item.score || '').toString(),
          episodes: '',
          ratingCount: (item.service_property?.view_count || item.viewCount || item.view_count || '').toString(),
          thumbnail: item.thumbnail ? `https://page-images.kakaoentcdn.com/download/resource?kid=${item.thumbnail}&filename=th` : '',
        }));
      }
    } catch (e) {}
  }

  try {
    const html = await getHtml('https://page.kakao.com/rank', {
      Origin: 'https://page.kakao.com',
      Referer: 'https://page.kakao.com/',
    });
    const $ = cheerio.load(html);
    const items = [];
    $('a[href*="/content/"]').each((_, el) => {
      if (items.length >= 100) return;
      const $a = $(el);
      const title = ($a.attr('title') || $a.find('.ell, .tit, .name, .title').first().text() || $a.text()).trim();
      if (title.length > 1 && title.length < 100 &&
          !title.includes('전체보기') && !title.includes('더보기') &&
          !title.includes('배너') && !title.includes('이벤트')) {
        const href = $a.attr('href') || '';
        items.push({
          rank: items.length + 1,
          title: title.replace(/<\/?[^>]+(>|$)/g, '').trim(),
          url: href.startsWith('http') ? href : `https://page.kakao.com${href}`,
          genre: '', author: '', rating: '', episodes: '', ratingCount: '', thumbnail: '',
        });
      }
    });
    if (items.length > 0) {
      console.log(`[KAKAO] HTML scrape — ${items.length} items`);
      return items.slice(0, 100);
    }
  } catch (e) {
    console.warn('[KAKAO] HTML scrape failed:', e.message);
  }

  throw new Error('카카오페이지 랭킹 데이터를 가져올 수 없습니다');
}

// ═══════════════════════════════════════════════════════════
//  2. NAVER SERIES — series.naver.com
// ═══════════════════════════════════════════════════════════
async function fetchNaverRanking(genre = '전체') {
  const html = await getHtml('https://series.naver.com/novel/top100List.series', {
    Referer: 'https://series.naver.com/',
  });
  const $ = cheerio.load(html);
  const items = [];

  function isValidNovelTitle(title) {
    if (!title || title.length < 2 || title.length > 100) return false;
    const adPatterns = [
      /매일\d+시\s?무료/i,
      /이벤트/i,
      /배너/i,
      /광고/i,
      /프로모션/i,
      /^\s*$/,
      /시리즈 에디션/i,
      /타임딜/i,
    ];
    return !adPatterns.some(p => p.test(title));
  }

  $('li.assemble_li_item, li.list_item, li.rank, li._item').each((_, el) => {
    if (items.length >= 100) return;
    const $li = $(el);
    const $a = $li.find('a[href*="productNo"]').first();
    if (!$a.length) return;

    const $titleEl = $a.find('.tit_book, .book_title, .title, .name').first();
    const title = ($titleEl.length ? $titleEl.text() :
                   $a.find('.tit, .ell').first().text() ||
                   $a.attr('title') ||
                   $a.text()).trim();

    if (isValidNovelTitle(title)) {
      const href = $a.attr('href') || '';
      const cleanTitle = title.replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/\[독점\]/g, '')
        .replace(/^새로운\s*에피소드\s*/, '')
        .replace(/^신규\s*/, '')
        .trim();

      const isDuplicate = items.some(item => item.url === href || (href && item.url && href.includes(item.url.split('productNo=')[1])));
      if (!isDuplicate && cleanTitle) {
        const rawThumb = $li.find('img').first().attr('src') || $li.find('img').first().attr('data-src') || '';
        const thumbnail = rawThumb.startsWith('//') ? 'https:' + rawThumb : rawThumb;
        items.push({
          rank: items.length + 1,
          title: cleanTitle,
          url: href.startsWith('http') ? href : `https://series.naver.com${href}`,
          genre: '', author: '', rating: '', episodes: '', ratingCount: '',
          thumbnail,
        });
      }
    }
  });

  if (items.length === 0) {
    $('a[href*="productNo"]').each((i, el) => {
      if (items.length >= 100) return;
      const $a = $(el);
      const title = ($a.find('.tit_book, .book_title, .title, .name, .tit').first().text() ||
                     $a.attr('title') ||
                     $a.text()).trim();
      if (isValidNovelTitle(title)) {
        const href = $a.attr('href') || '';
        const cleanTitle = title.replace(/<\/?[^>]+(>|$)/g, '').replace(/\[독점\]/g, '').trim();
        const isDuplicate = items.some(item => item.url === href || (href && item.url && href.includes(item.url.split('productNo=')[1])));
        if (!isDuplicate && cleanTitle) {
          items.push({
            rank: items.length + 1,
            title: cleanTitle,
            url: href.startsWith('http') ? href : `https://series.naver.com${href}`,
            genre: '', author: '', rating: '', episodes: '', ratingCount: '', thumbnail: '',
          });
        }
      }
    });
  }

  if (items.length === 0) throw new Error('네이버시리즈 랭킹 파싱 실패');
  return items.slice(0, 100);
}

async function fetchNovelpiaRanking(genre = '전체') {
  try {
    const html = await getHtml('https://novelpia.com/top100', {
      Referer: 'https://novelpia.com/',
    });
    const $ = cheerio.load(html);
    const items = [];
    const seen = new Set();

    $('div[onclick*="/novel/"]').each((i, el) => {
      if (items.length >= 100) return false;
      const $el = $(el);
      const onclick = $el.attr('onclick') || '';
      const urlMatch = onclick.match(/location\s*=\s*['"]([^'"]+)['"]/);
      if (!urlMatch) return;
      const rawUrl = urlMatch[1];
      const url = rawUrl.startsWith('http') ? rawUrl : 'https://novelpia.com' + rawUrl;
      if (seen.has(url)) return;
      seen.add(url);

      // Title
      let title = $el.find('b.cut_line_one').first().text().trim();
      title = title.replace(/\s+/g, ' ').trim();

      // Author
      let author = '';
      const $titleBold = $el.find('b.cut_line_one');
      if ($titleBold.length) {
        const $nextFont = $titleBold.nextAll('font').first();
        if ($nextFont.length) author = $nextFont.text().trim();
      }

      // Rating count (ex: "9.8K")
      let ratingCount = '';
      const $ratingFont = $el.find('font.thumb_s4').first();
      if ($ratingFont.length) {
        let rc = $ratingFont.text().trim();
        if (rc) {
          const match = rc.match(/^([\d,]+\.?\d*)([KM]?)$/i);
          if (match) {
            let num = parseFloat(match[1].replace(/,/g, ''));
            const suffix = match[2].toUpperCase();
            if (suffix === 'K') num *= 1000;
            else if (suffix === 'M') num *= 1000000;
            ratingCount = String(Math.round(num));
          } else {
            ratingCount = rc.replace(/[^0-9]/g, '');
          }
        }
      }

      // Episodes (like "236화")
      let episodes = '';
      const $ep = $el.find('div.thumb_s2, div.thumb_s8').first();
      if ($ep.length) {
        const epText = $ep.text().trim();
        const epMatch = epText.match(/(\d+)/);
        if (epMatch) episodes = epMatch[1];
        else episodes = epText;
      }

      const rawThumb = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
      const thumbnail = rawThumb
        ? (rawThumb.startsWith('http') ? rawThumb : 'https://novelpia.com' + rawThumb)
        : '';

      items.push({
        rank: items.length + 1,
        title,
        url,
        author,
        rating: '',
        episodes,
        ratingCount,
        genre: '',
        thumbnail,
      });
    });

    if (items.length > 0) {
      console.log('[NOVELPIA] HTML scrape — ' + items.length + ' items from top100');
      return items;
    }
    throw new Error('Novelpia: no items');
  } catch (e) {
    console.warn('[NOVELPIA] HTML scrape failed:', e.message);
    throw e;
  }
}

async function fetchMunpiaRanking(genre = '전체') {
  try {
    const html = await getHtml('https://www.munpia.com/page/j/view/w/best/plsa.eachtoday?displayType=LIST', {
      Referer: 'https://www.munpia.com/',
    });
    const $ = cheerio.load(html);
    const container = $('#best-rank-list-display');
    if (!container.length) {
      throw new Error('Munpia: list container not found');
    }
    const items = [];
    const seen = new Set();

    container.find('a').each((i, el) => {
      if (items.length >= 100) return false;
      const $a = $(el);
      const url = $a.attr('href');
      if (!url) return;
      if (seen.has(url)) return;
      seen.add(url);

      // Rank from .num
      const rankText = $a.find('.num').first().text().trim();
      const rank = parseInt(rankText.replace(/,/g, '')) || (items.length + 1);

      const title = $a.find('.title .title-wrap').first().text().trim();
      const author = $a.find('.author').first().text().trim();
      const genre = $a.find('.genre').text().trim().replace(/\s+/g, ' ');
      const ratingCount = $a.find('.view-count').first().text().trim().replace(/,/g, '');

      const rawThumb = $a.find('img').first().attr('src') || $a.find('img').first().attr('data-src') || '';
      const thumbnail = rawThumb.startsWith('//') ? 'https:' + rawThumb : rawThumb;

      items.push({
        rank,
        title,
        url,
        author,
        genre: '',
        rating: '',
        episodes: '',
        ratingCount,
        thumbnail,
      });
    });

    if (items.length > 0) {
      console.log('[MUNPIA] HTML scrape — ' + items.length + ' items from eachtoday LIST');
      return items;
    }
    throw new Error('Munpia: no items');
  } catch (e) {
    console.warn('[MUNPIA] HTML scrape failed:', e.message);
    // fallback to old method perhaps? For now rethrow
    throw e;
  }
}
async function fetchJoaraRanking(genre = '전체') {
  try {
    const data = await getJson(
      'https://api.joara.com/v2/search/query?api_key=mw_8ba234e7801ba288554ca07ae44c7188&ver=3.2.0&device=mw&deviceuid=96e10d445a2fee182478bcf9f5299cd781335f9b0e271f7131f5a764120f82c7&devicetoken=mw&query=&page=1&offset=100&store=all&orderby=score',
      { Referer: 'https://www.joara.com/' }
    );

    if (data.data?.list && data.data.list.length > 0) {
      return data.data.list.slice(0, 100).map((item, i) => ({
        rank: i + 1,
        title: item.subject || item.title || '',
        url: `https://www.joara.com/book/${item.book_code || item.bookCode}`,
        genre: item.category_name || item.category || '',
        author: (item.member_name || item.author || '').replace(/\[\[|\]\]/g, ''),
        rating: item.recommend_count ? String(item.recommend_count) : '',
        episodes: item.total_chapter_count ? item.total_chapter_count + '화' : '',
        ratingCount: item.favorite_count ? String(item.favorite_count) : '',
        thumbnail: item.cover || '',
      }));
    }
  } catch (e) {
    console.warn('[JOARA] API failed:', e.message);
  }

  try {
    const html = await getHtml('https://www.joara.com/rank/rank.html', {
      Referer: 'https://www.joara.com/',
    });
    const $ = cheerio.load(html);
    const items = [];
    $('li.list_item, li.rank-item, li.rank, ul.rankList > li').each((_, el) => {
      if (items.length >= 100) return;
      const $li = $(el);
      const $a = $li.find('a[href*="/view/"], a[href*="/book/"]').first();
      if (!$a.length) return;
      const title = ($a.attr('title') || $a.find('.book_name, .title, .name').first().text() || $a.text()).trim();
      if (title.length > 2 && title.length < 100) {
        const href = $a.attr('href') || '';
        items.push({
          rank: items.length + 1,
          title: title.replace(/<\/?[^>]+(>|$)/g, '').trim(),
          url: href.startsWith('http') ? href : `https://www.joara.com${href}`,
          genre: '', author: '', rating: '', episodes: '', ratingCount: '', thumbnail: '',
        });
      }
    });
    if (items.length > 0) return items.slice(0, 100);
  } catch (e) {
    console.warn('[JOARA] HTML scrape failed:', e.message);
  }

  throw new Error('조아라 랭킹 데이터를 가져올 수 없습니다');
}

const router = express.Router();

router.get('/ranking', async (req, res) => {
  const { platform, genre } = req.query;
  const g = genre || '전체';

  const SOURCES = [
    { key: 'kakao', fn: fetchKakaoRanking, platform: '카카오페이지' },
    { key: 'naver', fn: fetchNaverRanking, platform: '네이버시리즈' },
    { key: 'novelpia', fn: fetchNovelpiaRanking, platform: '노벨피아' },
    { key: 'munpia', fn: fetchMunpiaRanking, platform: '문피아' },
    { key: 'joara', fn: fetchJoaraRanking, platform: '조아라' },
  ];

  const targets = platform ? SOURCES.filter((s) => s.key === platform) : SOURCES;

  const rankings = [];
  for (const t of targets) {
    try {
      const rankData = await t.fn(g);
      rankings.push({
        platform: t.platform,
        platformKey: t.key,
        genre: g,
        rank: rankData,
      });
    } catch (err) {
      rankings.push({
        platform: t.platform,
        platformKey: t.key,
        genre: g,
        rank: [],
        error: err.message || 'Unknown',
      });
    }
    await new Promise(r => setTimeout(r, 500));
  }

  res.json({ rankings });
});

router._fetchFns = {
  kakao: fetchKakaoRanking,
  naver: fetchNaverRanking,
  novelpia: fetchNovelpiaRanking,
  munpia: fetchMunpiaRanking,
  joara: fetchJoaraRanking,
};

module.exports = router;

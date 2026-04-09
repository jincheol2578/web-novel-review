'use strict';

// analyze-ranking-apis.js — Fetch-based API discovery for ranking pages
// No browser needed, just HTTP requests to find ranking data

async function fetchHtml(url, extraHeaders = {}) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...extraHeaders,
  };
  const res = await fetch(url, { headers, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

async function fetchJson(url, extraHeaders = {}) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Accept': 'application/json, text/javascript, */*',
    ...extraHeaders,
  };
  const res = await fetch(url, { headers, timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// Strategy: Try known API patterns for each platform
const API_TESTS = {
  kakao: [
    { url: 'https://bff-page.kakao.com/api/v1/ranking/home?genre=0&period=WEEKLY&size=14', desc: 'bff ranking home' },
    { url: 'https://bff-page.kakao.com/api/gateway/api/v1/ranking/weeknovel?category_uid=0&size=14', desc: 'weeknovel bff' },
    { url: 'https://bff-page.kakao.com/api/v1/ranking/weeknovel?category_uid=0&size=14', desc: 'weeknovel v1' },
    { url: 'https://bff-page.kakao.com/api/v2/ranking/weeknovel?category_uid=0&size=14', desc: 'weeknovel v2' },
    { url: 'https://bff-page.kakao.com/api/v1/ranking/series?genre=0&period=week&size=10', desc: 'ranking series' },
    { url: 'https://page.kakao.com/api/v1/ranking?genre=0&size=10', desc: 'page api ranking' },
  ],
  naver: [
    { url: 'https://series.naver.com/novel/ranking.nhn', desc: 'ranking page scrapable' },
    { url: 'https://series.naver.com/search/genreSearch.series?t=novel&genre=100&order=rank', desc: 'genre ranking' },
    { url: 'https://series.naver.com/novel/rankingProductList.nhn?rankingNo=2', desc: 'ranking product list' },
    { url: 'https://series.naver.com/novel/rankingInfo.nhn?rankingNo=2', desc: 'ranking info' },
  ],
  novelpia: [
    { url: 'https://novelpia.com/proc/novel?cmd=get_novel_best&novel_type=', desc: 'novelpia best api' },
    { url: 'https://novelpia.com/ranking', desc: 'ranking page scrapable' },
    { url: 'https://novelpia.com/proc/rank', desc: 'rank proc' },
  ],
  munpia: [
    { url: 'https://novel.munpia.com/page/hd.platinum/view/ranking', desc: 'ranking page' },
    { url: 'https://novel.munpia.com/page/hd.platinum/view/ranking/novel', desc: 'novel ranking' },
    { url: 'https://novel.munpia.com/page/hd.platinum/view/ranking/best/novel/total', desc: 'best total' },
  ],
  joara: [
    { url: 'https://www.joara.com/rank/index.html', desc: 'ranking page' },
    { url: 'https://api.joara.com/v2/search/query?api_key=mw_8ba234e7801ba288554ca07ae44c7188&ver=3.2.0', desc: 'joara api' },
  ],
};

const platforms = [
  { key: 'kakao', name: '카카오페이지' },
  { key: 'naver', name: '네이버시리즈' },
  { key: 'novelpia', name: '노벨피아' },
  { key: 'munpia', name: '문피아' },
  { key: 'joara', name: '조아라' },
];

// Also scrape HTML pages and look for API URLs in JS code
async function findApiUrlsInHtml(html, platformName) {
  const apiPatterns = [
    /["'](https?:\/\/[^"']*(?:ranking|bestseller|best|rank)[^"']*)["']/gi,
    /["'](\/(?:api|proc)[^"']*(?:ranking|bestseller|best|rank)[^"']*)["']/gi,
    /fetch\(["']([^"']*(?:ranking|rank)[^"']*)["']\)/gi,
    /axios\.(?:get|post)\(["']([^"']*(?:ranking|rank)[^"']*)["']\)/gi,
    /url:\s*["']([^"']*(?:ranking|rank)[^"']*)["']/gi,
  ];

  const found = new Set();
  for (const pattern of apiPatterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      found.add(m[1]);
    }
  }

  if (found.size > 0) {
    console.log(`  🔍 API URLs found in HTML for ${platformName}:`);
    for (const url of found) {
      console.log(`    → ${url}`);
    }
  }
  return Array.from(found);
}

// Extract ranking items from HTML
async function extractRankingFromHtml(html, platformName) {
  // Look for common ranking patterns
  const patterns = [
    // <li> with ranking info
    /<li[^>]*>(.*?)<\/li>/gs,
  ];

  const rankings = [];
  
  // Look for numbered items
  const numberedPattern = /<span[^>]*class[^>]*rank[^>]*>[^<]*<\/span>[^<]*<a[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = numberedPattern.exec(html)) !== null) {
    rankings.push(m[1].trim());
  }

  // Look for links in ordered lists
  const olPattern = /<ol[^>]*rank[^>]*>.*?<li[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gs;
  while ((m = olPattern.exec(html)) !== null) {
    rankings.push({ title: m[2].trim(), href: m[1] });
  }

  if (rankings.length > 0) {
    console.log(`  📋 Found ${rankings.length} ranking items in HTML`);
  }

  return rankings;
}

(async () => {
  console.log('=== Ranking API Discovery ===\n');

  for (const platform of platforms) {
    console.log(`\n--- ${platform.name} (${platform.key}) ---`);
    const tests = API_TESTS[platform.key] || [];

    // Try API endpoints
    for (const test of tests) {
      try {
        let data;
        if (test.url.endsWith('.nhn') || test.url.endsWith('.html')) {
          // This is an HTML page, scrape it
          const html = await fetchHtml(test.url, {
            'Referer': `https://${platform.key === 'joara' ? 'www.' : platform.key === 'munpia' ? 'novel.' : platform.key === 'novelpia' ? '' : 'page. kakao.com/'}`,
          });
          console.log(`  ✅ HTML ${test.desc}: ${test.url} (${html.length} bytes)`);
          
          // Find API URLs in JS
          const apiUrls = await findApiUrlsInHtml(html, platform.name);
          if (apiUrls.length > 0) {
            // Try the found APIs
            for (const apiUrl of apiUrls.slice(0, 5)) {
              if (apiUrl.startsWith('/')) {
                const domain = platform.key === 'kakao' ? 'https://bff-page.kakao.com' 
                  : platform.key === 'novelpia' ? 'https://novelpia.com'
                  : platform.key === 'munpia' ? 'https://novel.munpia.com'
                  : platform.key === 'joara' ? 'https://www.joara.com'
                  : 'https://series.naver.com';
                const fullUrl = domain + apiUrl;
                try {
                  const json = await fetchJson(fullUrl);
                  console.log(`    ✅ JSON from ${fullUrl}: ${JSON.stringify(json).slice(0, 300)}`);
                } catch (e) {
                  console.log(`    ❌ JSON from ${fullUrl}: ${e.message}`);
                }
              } else if (apiUrl.startsWith('http')) {
                try {
                  const json = await fetchJson(apiUrl);
                  console.log(`    ✅ JSON from ${apiUrl}: ${JSON.stringify(json).slice(0, 300)}`);
                } catch (e) {
                  console.log(`    ❌ JSON from ${apiUrl}: ${e.message}`);
                }
              }
            }
          }
        } else {
          // This is a JSON API
          try {
            const json = await fetchJson(test.url);
            console.log(`  ✅ JSON ${test.desc}: ${JSON.stringify(json).slice(0, 300)}`);
          } catch (e) {
            console.log(`  ❌ JSON ${test.desc}: ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`  ❌ ${test.desc}: ${e.message}`);
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== Discovery Complete ===');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

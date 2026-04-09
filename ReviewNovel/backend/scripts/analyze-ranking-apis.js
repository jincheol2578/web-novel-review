// analyze-ranking-apis.js — Playwright network sniffer for ranking APIs
const { chromium } = require('playwright');

const PLATFORMS = [
  {
    name: '카카오페이지',
    url: 'https://page.kakao.com/ranking/novel',
    keywords: ['ranking', 'bestseller', 'rank', 'novel', 'api', 'gateway', 'proc'],
  },
  {
    name: '네이버시리즈',
    url: 'https://series.naver.com/ranking.nhn',
    keywords: ['ranking', 'bestseller', 'rank', 'novel', 'api', 'series'],
  },
  {
    name: '노벨피아',
    url: 'https://novelpia.com/ranking',
    keywords: ['ranking', 'novel', 'proc', 'ranking', 'api'],
  },
  {
    name: '문피아',
    url: 'https://novel.munpia.com/ranking',
    keywords: ['ranking', 'novel', 'api', 'rank', 'bestseller'],
  },
  {
    name: '조아라',
    url: 'https://www.joara.com/rank/index.html',
    keywords: ['ranking', 'novel', 'api', 'rank', 'bestseller'],
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const platform of PLATFORMS) {
    console.log(`\n========== ${platform.name} ==========`);
    console.log(`URL: ${platform.url}`);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR',
    });

    const page = await context.newPage();
    const apiCalls = [];

    page.on('request', (req) => {
      const url = req.url();
      const isRelevant = platform.keywords.some((kw) =>
        url.toLowerCase().includes(kw.toLowerCase())
      ) || url.includes('/api/') || url.includes('/proc/') || url.includes('proc=');
      
      if (isRelevant && (req.method() === 'GET' || req.method() === 'POST')) {
        apiCalls.push({
          method: req.method(),
          url: url,
          postData: req.postData() || null,
          headers: req.headers(),
        });
      }
    });

    try {
      await page.goto(platform.url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(3000);

      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1500);

      // Click ranking tabs if they exist
      const tabSelectors = [
        'a[onclick*="ranking"]', '.tab a', '.tab-item', '[class*="tab"] a',
        '.genre-tab', '.ranking-tab', '[role="tab"]',
      ];
      for (const sel of tabSelectors) {
        const tabs = await page.$$(sel);
        if (tabs.length > 0) {
          console.log(`  Found ${tabs.length} tabs with selector: ${sel}`);
        }
      }

      // Filter unique API calls
      const uniqueApis = [];
      const seen = new Set();
      for (const call of apiCalls) {
        const key = call.url.split('?')[0];
        if (!seen.has(key)) {
          seen.add(key);
          uniqueApis.push(call);
        }
      }

      if (uniqueApis.length === 0) {
        console.log('  ⚠️ No API calls detected. Dumping ALL requests...');
        // Fallback: show all XHR/fetch requests
      }

      console.log(`  📡 Found ${uniqueApis.length} API calls:`);
      for (const call of uniqueApis) {
        console.log(`  ${call.method} ${call.url}`);
        if (call.postData) {
          console.log(`    Body: ${call.postData.slice(0, 200)}`);
        }
      }

      // Also try to extract ranking data from the page
      const pageData = await page.evaluate(() => {
        const items = [];
        // Try common ranking selectors
        const lists = document.querySelectorAll('ol, ul');
        for (const list of lists) {
          const children = list.querySelectorAll('li');
          if (children.length >= 5) {
            const itemTexts = Array.from(children).slice(0, 5).map((li) => {
              const a = li.querySelector('a');
              return {
                text: li.textContent.trim().slice(0, 100),
                href: a ? a.href : '',
              };
            });
            items.push({
              listType: list.className || list.id || 'unknown',
              items: itemTexts,
            });
          }
        }
        return items;
      });

      if (pageData.length > 0) {
        console.log(`  📋 Found ${pageData.length} list structures:`);
        for (const list of pageData.slice(0, 3)) {
          console.log(`    [${list.listType}]`);
          for (const item of list.items) {
            console.log(`      ${item.text}`);
          }
        }
      }

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      
      // Take screenshot for debugging
      const safeName = platform.name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      await page.screenshot({ path: `/tmp/ranking_${platform.name}.png` }).catch(() => {});
      console.log(`  📸 Screenshot saved to /tmp/ranking_${platform.name}.png`);
    }

    await context.close();
    await new Promise((r) => setTimeout(r, 1000));
  }

  await browser.close();
  console.log('\n✅ Analysis complete!');
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

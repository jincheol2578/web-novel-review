/**
 * Playwright 스크립트: 각 플랫폼 랭킹 페이지에서 API 요청 캡처
 * 실행: node scripts/capture-network.js
 * 필요: npx playwright install chromium
 */

const { chromium } = require('playwright');

const TARGETS = [
  {
    name: '카카오페이지',
    key: 'kakao',
    urls: [
      'https://page.kakao.com/rank',
    ],
  },
  {
    name: '노벨피아',
    key: 'novelpia',
    urls: [
      'https://novelpia.com/novel_ranking',
    ],
  },
  {
    name: '문피아',
    key: 'munpia',
    urls: [
      'https://www.munpia.com/page/j/view/w/best/plsa.bestseller?displayType=GRID',
      'https://novel.munpia.com/ranking',
    ],
  },
  {
    name: '조아라',
    key: 'joara',
    urls: [
      'https://www.joara.com/rank/rank.html',
    ],
  },
];

async function captureRequests(platform, url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ${platform.name} — ${url}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });

  const page = await context.newPage();
  const requests = [];

  // XHR/Fetch 요청만 캡처
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type === 'xhr' || type === 'fetch') {
      requests.push({
        url: req.url(),
        method: req.method(),
        type: type,
        headers: req.headers(),
        postBody: req.postData() || null,
      });
    }
  });

  page.on('response', async (res) => {
    const req = res.request();
    if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
      try {
        const body = await res.text();
        const match = requests.find(r => r.url === req.url() && r.method === req.method());
        if (match) {
          match.status = res.status();
          match.responseBody = body.substring(0, 2000); // 첫 2000자만
          match.contentType = res.headers()['content-type'] || '';
        }
      } catch (e) {
        // ignore
      }
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // 추가 대기 — JS 렌더링 기다리기
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log(`⚠️ 페이지 로딩 timeout: ${e.message}`);
  }

  // 결과 출력
  const apiRequests = requests.filter(r =>
    !r.url.includes('.css') &&
    !r.url.includes('.js') &&
    !r.url.includes('.png') &&
    !r.url.includes('.jpg') &&
    !r.url.includes('.gif') &&
    !r.url.includes('analytics') &&
    !r.url.includes('telemetry') &&
    !r.url.includes('google') &&
    !r.url.includes('doubleclick')
  );

  if (apiRequests.length === 0) {
    console.log('❌ XHR/Fetch 요청 없음 (클릭/스크롤 필요할 수 있음)');
    // 스크롤 시도
    try {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(3000);
    } catch (e) {}
  }

  console.log(`\n📦 Found ${apiRequests.length} API request(s):\n`);
  for (const r of apiRequests) {
    console.log(`  ${r.method} ${r.url}`);
    if (r.postBody) console.log(`    Body: ${r.postBody.substring(0, 200)}`);
    if (r.status) console.log(`    Status: ${r.status} (${r.contentType})`);
    if (r.responseBody) console.log(`    Response: ${r.responseBody.substring(0, 500)}...`);
    console.log();
  }

  await browser.close();
  return apiRequests;
}

async function main() {
  console.log('🔍 웹소설 플랫폼 랭킹 API 캡처 시작');
  console.log(`   시작: ${new Date().toISOString()}`);

  for (const platform of TARGETS) {
    for (const url of platform.urls) {
      try {
        await captureRequests(platform, url);
      } catch (e) {
        console.error(`❌ ${platform.name} (${url}): ${e.message}`);
      }
    }
  }

  console.log('\n✅ 완료');
}

main().catch(console.error);

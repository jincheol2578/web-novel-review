'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CX = process.env.GOOGLE_CX || '';
const MODEL = process.env.REVIEW_MODEL || 'qwen/qwen3.6-plus:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Search the web for novel reviews and compile a compact 5-line AI summary.
 */
async function searchAndSummarizeReviews(novelTitle) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  let searchResults = [];

  // Try Google Custom Search API first (if configured)
  if (GOOGLE_API_KEY && GOOGLE_CX) {
    searchResults = await googleCustomSearch(novelTitle);
  }

  // Fallback: web scrape Google search results
  if (searchResults.length === 0) {
    searchResults = await scrapeGoogleSearch(novelTitle);
  }

  // Build review snippets (max 10 for speed)
  const reviewsText = searchResults.length > 0
    ? searchResults
        .slice(0, 10)
        .map((r, i) => `  ${i + 1}. ${r.snippet}`)
        .join('\n')
    : '  (검색 결과 없음)';

  // Compact 5-line prompt
  const prompt = `소설 "${novelTitle}" 리뷰를 다음 5줄로 요약하세요. 각 항목 한 줄씩:

검색 참고:
${reviewsText}

📖 개요: (장르+줄거리 한 줄)
⭐ 평점: (★★★★☆)
👍 호평: (가장 큰 장점 한 줄)
👎 단점: (가장 큰 아쉬움 한 줄)
💡 총평: (한 줄 + X/10점)`;

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You analyze Korean novels. Respond in Korean only. Exactly 5 short lines.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 256,
        top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://reviewnovel.app',
          'X-Title': 'ReviewNovel',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 응답이 없습니다.');

    return content;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data?.error) {
      throw new Error(`OpenRouter API 오류: ${err.response.data.error.message}`);
    }
    throw new Error(`리뷰 요약 실패: ${err.message}`);
  }
}

/**
 * Search via Google Custom Search API
 */
async function googleCustomSearch(novelTitle) {
  const results = [];
  const queries = [
    `"${novelTitle}" 소설 리뷰 평점 추천`,
  ];

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10&lr=lang_ko&gl=kr`;
      const { data } = await axios.get(url, { timeout: 10000 });

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          results.push({
            title: item.title,
            snippet: item.snippet || '',
            url: item.link || '',
          });
        }
      }
    } catch (err) {
      console.warn(`[GOOGLE_SEARCH] Query "${query}" failed: ${err.message}`);
    }
    if (results.length > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

/**
 * Fallback: web scrape Google search results
 */
async function scrapeGoogleSearch(novelTitle) {
  const query = `"${novelTitle}" 소설 리뷰 평점 추천`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=ko&gl=kr`;

  try {
    const html = await fetchWithHeader(searchUrl);
    const $ = cheerio.load(html);
    const results = [];

    $('div.g, div.tF2Cxc').each((i, el) => {
      const title = $(el).find('h3').first().text().trim();
      const snippet = $(el).find('div.VwiC3b, span.aCOpRe').first().text().trim();
      const url = $(el).find('a').first().attr('href') || '';
      if (title && snippet && title.length > 5) {
        results.push({ title, snippet, url });
      }
    });

    return results;
  } catch (err) {
    console.warn(`[GOOGLE_SCRAPED] Failed: ${err.message}`);
    return [];
  }
}

async function fetchWithHeader(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { searchAndSummarizeReviews };

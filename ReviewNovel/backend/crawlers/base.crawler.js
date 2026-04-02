'use strict';

const { normalizeText, findBestMatch } = require('../utils/sanitize');

const TIMEOUT = parseInt(process.env.CRAWL_TIMEOUT_MS || '15000', 10);

class BaseCrawler {
  constructor(platformName, platformKey) {
    this.platformName = platformName;
    this.platformKey = platformKey;
  }

  // Subclasses implement this
  // Returns: { matchedTitle, url, rating, ratingCount, reviews }
  // reviews: [{ text, author, date, url }]
  async crawl(novelTitle) {
    throw new Error('crawl() not implemented');
  }

  async search(novelTitle) {
    const tag = `[${this.platformName}][${novelTitle}]`;
    console.log(`${tag} 크롤링 시작`);
    const t0 = Date.now();
    try {
      console.log(`[SEARCH] About to call withRetry for ${this.platformName}`);
      const result = await this.withRetry(() => {
        console.log(`[SEARCH-RETRY] Calling crawl for ${this.platformName}`);
        return this.crawl(novelTitle);
      });
      console.log(`${tag} 성공 (${Date.now() - t0}ms) | 매칭: "${result.matchedTitle}" | rating: ${result.rating || '-'} | ratingCount: ${result.ratingCount || '-'}`);
      return {
        platform: this.platformName,
        platformKey: this.platformKey,
        status: 'success',
        ...result,
      };
    } catch (err) {
      const status = err.status || 'error';
      console.error(`${tag} ${status} (${Date.now() - t0}ms) | ${err.message}`);
      return {
        platform: this.platformName,
        platformKey: this.platformKey,
        status,
        error: err.message,
      };
    }
  }

  async withRetry(fn, retries = 2) {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (err.status === 'not_found' || err.status === 'login_required') throw err;
        if (i < retries) await sleep(1000 * (i + 1));
      }
    }
    throw lastErr;
  }

  async fetchHtml(url, opts = {}) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...opts.headers,
    };

    const response = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      timeout: opts.timeout || TIMEOUT,
      ...(opts.body && { body: opts.body }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.text();
  }

  async fetchJson(url, opts = {}) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...opts.headers,
    };

    const response = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      timeout: opts.timeout || TIMEOUT,
      ...(opts.body && { body: JSON.stringify(opts.body) }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  }

  notFound() {
    const err = new Error('검색 결과 없음');
    err.status = 'not_found';
    return err;
  }

  loginRequired() {
    const err = new Error('로그인 필요');
    err.status = 'login_required';
    return err;
  }

  normalize(text) {
    return normalizeText(text);
  }

  findBest(query, list, extractor) {
    return findBestMatch(query, list, extractor);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { BaseCrawler, sleep };

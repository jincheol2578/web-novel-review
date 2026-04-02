'use strict';

const { chromium } = require('playwright');

const REALISTIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

class BrowserPool {
  constructor(size = 2) {
    this.size = size;
    this.pool = [];
    this.waitQueue = [];
  }

  async init() {
    for (let i = 0; i < this.size; i++) {
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--lang=ko-KR',
        ],
      });
      this.pool.push({ browser, inUse: false });
    }
  }

  async acquire() {
    const free = this.pool.find((b) => !b.inUse);
    if (free) {
      free.inUse = true;
      return free.browser;
    }
    return new Promise((resolve) => this.waitQueue.push(resolve));
  }

  release(browser) {
    const entry = this.pool.find((b) => b.browser === browser);
    if (!entry) return;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      resolve(browser);
    } else {
      entry.inUse = false;
    }
  }

  async newContext(browser) {
    return browser.newContext({
      userAgent: REALISTIC_UA,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
    });
  }

  async destroy() {
    for (const { browser } of this.pool) {
      await browser.close().catch(() => {});
    }
  }
}

const pool = new BrowserPool(parseInt(process.env.BROWSER_POOL_SIZE || '2', 10));

module.exports = { pool, REALISTIC_UA };

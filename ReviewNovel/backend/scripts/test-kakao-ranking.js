'use strict';

const http = require('http');

const options = {
  hostname: 'bff-page.kakao.com',
  path: '/api/gateway/api/v1/ranking/home?genre=0&period=REALTIME&size=10',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Origin': 'https://page.kakao.com',
    'Referer': 'https://page.kakao.com/',
  },
  timeout: 10000,
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log(data.slice(0, 3000));
  });
});
req.on('error', (e) => console.error('ERROR:', e.message));
req.on('timeout', () => { req.destroy(); console.error('TIMEOUT'); });
req.end();

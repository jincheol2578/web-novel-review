'use strict';

const express = require('express');
const axios = require('axios');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const MODEL = process.env.REVIEW_MODEL || 'qwen/qwen3.6-plus:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/recommend', requireAuth, async (req, res) => {
  const { ratings } = req.body;
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return res.status(400).json({ error: '평점 데이터가 필요합니다.' });
  }

  const list = ratings.map(r => {
    let line = `- ${r.title}: ${r.score}/10점`;
    if (r.reviews && r.reviews.length > 0) {
      const reviewTexts = r.reviews
        .map(rv => `"${rv.content.slice(0, 120).replace(/\n/g, ' ')}"`)
        .join(' / ');
      line += `\n  사용자 리뷰: ${reviewTexts}`;
    }
    return line;
  }).join('\n');

  const prompt = `다음은 사용자가 직접 평가한 웹소설 목록입니다 (평점과 리뷰 포함):\n${list}\n\n위 취향과 리뷰 내용을 종합해서 아직 읽지 않은 한국 웹소설 5편을 추천해 주세요. 반드시 JSON 배열만 응답하세요:\n[{"title":"","genre":"","reason":""}]`;

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: '당신은 한국 웹소설 전문가입니다. 요청받은 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://reviewnovel.app',
          'X-Title': 'ReviewNovel',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '[]';
    const match = content.match(/\[[\s\S]*\]/);
    const recommendations = match ? JSON.parse(match[0]) : [];
    res.json({ recommendations });
  } catch (err) {
    console.error('[RECOMMEND_ERROR]', err.message);
    res.status(500).json({ error: '추천 생성 실패: ' + err.message });
  }
});

module.exports = router;

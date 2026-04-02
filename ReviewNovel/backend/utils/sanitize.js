'use strict';

function normalizeText(text) {
  if (!text) return '';
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalizeText(a).toLowerCase();
  const nb = normalizeText(b).toLowerCase();
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Bigram similarity
  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let intersection = 0;
  for (const g of ba) if (bb.has(g)) intersection++;
  return (2 * intersection) / (ba.size + bb.size) || 0;
}

function findBestMatch(query, candidates, titleExtractor) {
  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const title = titleExtractor ? titleExtractor(candidate) : candidate;
    const score = titleSimilarity(query, title);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= 0.4 ? best : null;
}

module.exports = { normalizeText, titleSimilarity, findBestMatch };

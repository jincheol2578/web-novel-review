/**
 * Opens an SSE stream to /api/search/stream and calls callbacks as events arrive.
 * @param {string[]} novels - array of novel titles
 * @param {(event: object) => void} onEvent - called for each SSE event
 * @returns {() => void} close function
 */
export function streamSearch(novels, onEvent) {
  const query = novels.map(encodeURIComponent).join(',');
  const url = `/api/search/stream?novels=${query}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
      if (data.type === 'done' || data.type === 'error') {
        es.close();
      }
    } catch {}
  };

  es.onerror = () => {
    onEvent({ type: 'error', message: '서버 연결 오류' });
    es.close();
  };

  return () => es.close();
}

/**
 * Summarize reviews for a specific platform using OpenRouter AI.
 * @param {string} novelTitle - Novel title
 * @param {string} platformName - Platform name
 * @param {Array} reviews - Array of review objects
 * @returns {Promise<string>} AI summary
 */
export async function summarizeReviews(novelTitle, platformName, reviews) {
  const res = await fetch('/api/review/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelTitle, platformName, reviews }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'AI 리뷰 요약 실패');
  }

  const data = await res.json();
  return data.summary;
}

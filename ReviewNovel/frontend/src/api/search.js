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

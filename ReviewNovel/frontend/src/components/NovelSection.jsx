import { useState } from 'react';
import PlatformCard from './PlatformCard';
import SkeletonCard from './SkeletonCard';
import ReviewSummary from './ReviewSummary';
import styles from './NovelSection.module.css';

export default function NovelSection({ platforms, pendingPlatforms, done, novelTitle }) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if any platform returned data
  const platformResults = Object.values(platforms || {}).filter(
    (p) => p?.status === 'success'
  );
  const hasResults = platformResults.length > 0;

  // AI 리뷰 요약: 웹에서 소설 리뷰 검색 → AI로 종합 분석
  const handleSummarize = async () => {
    if (!novelTitle) return;
    setSummaryOpen(true);
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch('/api/review/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelTitle }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '리뷰 요약 실패');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.grid}>
      {/* AI 리뷰 요약 - always show when search is done or has results */}
      {(hasResults || done) && novelTitle && (
        <div className={styles.aiSummarySection}>
          {!summaryOpen && (
            <button
              className={styles.aiSummaryButton}
              onClick={handleSummarize}
              disabled={loading}
            >
              🤖 AI 리뷰 요약
            </button>
          )}

          {summaryOpen && (
            <ReviewSummary
              summary={summary}
              error={error}
              loading={loading}
              onClose={() => setSummaryOpen(false)}
              onRetry={handleSummarize}
            />
          )}
        </div>
      )}

      {/* Platform cards */}
      {Object.keys(platforms || {}).map((key) => {
        const data = platforms[key];
        if (data) {
          return <PlatformCard key={key} data={data} />;
        }
        if (!done && pendingPlatforms?.includes(key)) {
          return <SkeletonCard key={key} />;
        }
        return null;
      })}
    </div>
  );
}

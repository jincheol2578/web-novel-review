import ReactMarkdown from 'react-markdown';
import styles from './ReviewSummary.module.css';

export default function ReviewSummary({ summary, error, loading, onClose, onRetry }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>🤖 AI 리뷰 요약</span>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      {loading && <div className={styles.loading}>⏳ 웹에서 리뷰 검색 및 분석 중... (약 20-30초)</div>}
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.error}>❌ {error}</div>
          <button className={styles.retryButton} onClick={onRetry}>🔄 재시도</button>
        </div>
      )}

      {summary && (
        <div className={styles.summary}>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

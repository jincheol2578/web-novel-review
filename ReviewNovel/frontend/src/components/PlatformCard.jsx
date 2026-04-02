import ReviewItem from './ReviewItem';
import styles from './PlatformCard.module.css';

const PLATFORM_COLORS = {
  kakao: '#fee500',
  naver: '#03c75a',
  munpia: '#7b5ea7',
  novelpia: '#e83e2d',
  joara: '#0073e6',
};

const STATUS_LABEL = {
  not_found: '검색 결과 없음',
  login_required: '로그인 필요',
  timeout: '시간 초과',
  error: '오류 발생',
};

// 플랫폼별 지표 레이블 (별점 없는 플랫폼은 별 대신 적절한 아이콘/텍스트 사용)
const RATING_META = {
  kakao:    { icon: '★', ratingLabel: '별점', countLabel: '누적조회' },
  naver:    { icon: '★', ratingLabel: '별점', countLabel: '', downloadLabel: '다운로드' },
  munpia:   { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  novelpia: { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  joara:    { icon: '♥', ratingLabel: '선호작', countLabel: '추천' },
};

export default function PlatformCard({ data }) {
  const { platform, platformKey, status, matchedTitle, url, rating, ratingCount, downloadCount, reviews, error } = data;
  const accent = PLATFORM_COLORS[platformKey] || '#ccc';
  const isSuccess = status === 'success';
  const meta = RATING_META[platformKey] || { icon: '★', ratingLabel: '평점', countLabel: '' };

  return (
    <div
      className={`${styles.card} ${!isSuccess ? styles.muted : ''}`}
      style={{ '--accent': accent }}
    >
      <div className={styles.cardTop}>
        <span className={styles.platformBadge}>{platform}</span>
        {isSuccess && rating && (
          <span className={styles.rating}>
            {meta.icon} {meta.ratingLabel} {rating}
            {ratingCount && meta.countLabel && (
              <span className={styles.ratingCount}> · {meta.countLabel} {ratingCount}</span>
            )}
            {downloadCount && meta.downloadLabel && (
              <span className={styles.ratingCount}> · {meta.downloadLabel} {downloadCount}</span>
            )}
          </span>
        )}
      </div>

      {isSuccess ? (
        <>
          {matchedTitle && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.matchedTitle}
            >
              {matchedTitle}
            </a>
          )}
          <div className={styles.reviews}>
            {reviews && reviews.length > 0 ? (
              reviews.map((r, i) => <ReviewItem key={i} review={r} novelUrl={url} />)
            ) : (
              <p className={styles.noReviews}>리뷰 없음</p>
            )}
          </div>
        </>
      ) : (
        <div className={styles.statusMessage}>
          <span>{STATUS_LABEL[status] || '알 수 없는 오류'}</span>
          {error && <span className={styles.errorDetail}>{error}</span>}
        </div>
      )}
    </div>
  );
}

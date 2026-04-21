import { useState } from 'react';
import ReviewItem from './ReviewItem';
import RatingWidget from './RatingWidget';
import { useReviews } from '../hooks/useReviews';
import { useRatings } from '../hooks/useRatings';
import { useAuth } from '../contexts/AuthContext';
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

const RATING_META = {
  kakao:    { icon: '★', ratingLabel: '별점', countLabel: '누적조회' },
  naver:    { icon: '★', ratingLabel: '별점', countLabel: '', downloadLabel: '다운로드' },
  munpia:   { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  novelpia: { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  joara:    { icon: '♥', ratingLabel: '선호작', countLabel: '추천' },
};

export default function PlatformCard({ data }) {
  const {
    platform, platformKey, status, matchedTitle, url,
    rating, ratingCount, downloadCount, reviews: crawledReviews,
    error, thumbnail, genre, isComplete, totalChapter, author, category
  } = data;

  const { user } = useAuth();
  const { reviews: dbReviews, loading: reviewsLoading, addReview, updateReview, deleteReview } = useReviews(matchedTitle, platformKey);
  const { myRating, avgRating, totalCount, upsertRating } = useRatings(matchedTitle);

  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const accent = PLATFORM_COLORS[platformKey] || '#ccc';
  const isSuccess = status === 'success';
  const meta = RATING_META[platformKey] || { icon: '★', ratingLabel: '평점', countLabel: '' };

  const allReviews = [
    ...(dbReviews || []).map(r => ({
      ...r,
      text: r.content,
      author: r.author_name,
      date: new Date(r.created_at).toLocaleDateString('ko-KR'),
      isDbReview: true,
    })),
    ...(crawledReviews || []).map(r => ({ ...r, isDbReview: false })),
  ];

  const handleAddReview = async () => {
    if (!reviewText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addReview({ content: reviewText, authorName: reviewAuthor || '익명' });
      setReviewText('');
      setReviewAuthor('');
      setShowReviewInput(false);
    } catch {
      alert('리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.card} ${!isSuccess ? styles.muted : ''}`} style={{ '--accent': accent }}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTop}>
          <span className={styles.platformBadge}>{platform}</span>
          <div className={styles.cardTopRight}>
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
            {avgRating && (
              <span className={styles.communityRating}>
                ⭐ {avgRating}<small>/10</small>
                <span className={styles.communityCount}>({totalCount}명)</span>
              </span>
            )}
          </div>
        </div>

        {thumbnail && (
          <div className={styles.thumbnailWrapper}>
            <img
              src={thumbnail}
              alt={matchedTitle || '소설 썸네일'}
              className={styles.thumbnail}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {isSuccess ? (
        <>
          {matchedTitle && (
            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.matchedTitle}>
              {matchedTitle}
            </a>
          )}

          <div className={styles.metaInfo}>
            {author && <span className={styles.metaTag}>✍️ {author}</span>}
            {category && <span className={styles.metaTag}>📂 {category}</span>}
            {genre && (Array.isArray(genre) ? genre : [genre]).map((g, i) => (
              <span key={i} className={styles.metaTag}>🏷️ {g}</span>
            ))}
            {isComplete !== undefined && (
              <span className={`${styles.metaTag} ${isComplete ? styles.complete : styles.ongoing}`}>
                {isComplete ? '✅ 완결' : '📝 연재중'}
              </span>
            )}
            {totalChapter && <span className={styles.metaTag}>📑 {totalChapter}화</span>}
          </div>

          {user && (
            <RatingWidget value={myRating} onChange={upsertRating} />
          )}

          <div className={styles.reviews}>
            <div className={styles.reviewsHeader}>
              <h4>리뷰 ({allReviews.length})</h4>
              <button
                className={styles.addReviewBtn}
                onClick={() => setShowReviewInput(!showReviewInput)}
              >
                {showReviewInput ? '취소' : '리뷰 쓰기'}
              </button>
            </div>

            {showReviewInput && (
              <div className={styles.reviewInputForm}>
                {!user && (
                  <input
                    type="text"
                    placeholder="닉네임 (기본: 익명)"
                    value={reviewAuthor}
                    onChange={e => setReviewAuthor(e.target.value)}
                    className={styles.reviewAuthorInput}
                  />
                )}
                <textarea
                  placeholder="소설에 대한 솔직한 의견을 남겨주세요..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className={styles.reviewTextInput}
                  rows={3}
                />
                <button
                  className={styles.submitReviewBtn}
                  onClick={handleAddReview}
                  disabled={!reviewText.trim() || submitting}
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            )}

            {reviewsLoading ? (
              <p className={styles.noReviews}>리뷰를 불러오는 중...</p>
            ) : allReviews.length > 0 ? (
              allReviews.map((r, i) => (
                <ReviewItem
                  key={r.id || i}
                  review={r}
                  currentUserId={user?.id}
                  onUpdate={updateReview}
                  onDelete={deleteReview}
                />
              ))
            ) : (
              <p className={styles.noReviews}>아직 리뷰가 없습니다. 첫 리뷰를 남겨보세요!</p>
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

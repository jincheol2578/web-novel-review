import { useState } from 'react';
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

// 플랫폼별 지표 레이블
const RATING_META = {
  kakao:    { icon: '★', ratingLabel: '별점', countLabel: '누적조회' },
  naver:    { icon: '★', ratingLabel: '별점', countLabel: '', downloadLabel: '다운로드' },
  munpia:   { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  novelpia: { icon: '👍', ratingLabel: '추천', countLabel: '선호작' },
  joara:    { icon: '♥', ratingLabel: '선호작', countLabel: '추천' },
};

export default function PlatformCard({ data }) {
  const { 
    platform, 
    platformKey, 
    status, 
    matchedTitle, 
    url, 
    rating, 
    ratingCount, 
    downloadCount, 
    reviews, 
    error, 
    thumbnail,
    genre,
    isComplete,
    totalChapter,
    author,
    category
  } = data;
  
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewAuthor, setReviewAuthor] = useState('익명');

  const accent = PLATFORM_COLORS[platformKey] || '#ccc';
  const isSuccess = status === 'success';
  const meta = RATING_META[platformKey] || { icon: '★', ratingLabel: '평점', countLabel: '' };

  const handleAddReview = () => {
    if (!reviewText.trim()) return;
    
    const newReview = {
      text: reviewText,
      author: reviewAuthor || '익명',
      date: '방금 전',
      url: url,
      isUserGenerated: true
    };
    
    setMyReviews([...myReviews, newReview]);
    setReviewText('');
    setShowReviewInput(false);
  };

  const allReviews = [...(reviews || []), ...myReviews];

  return (
    <div
      className={`${styles.card} ${!isSuccess ? styles.muted : ''}`}
      style={{ '--accent': accent }}
    >
      <div className={styles.cardHeader}>
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
        
        {thumbnail && (
          <div className={styles.thumbnailWrapper}>
            <img 
              src={thumbnail} 
              alt={matchedTitle || '소설 썸네일'} 
              className={styles.thumbnail}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
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
                <input
                  type="text"
                  placeholder="닉네임 (기본: 익명)"
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  className={styles.reviewAuthorInput}
                />
                <textarea
                  placeholder="소설에 대한 솔직한 의견을 남겨주세요..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className={styles.reviewTextInput}
                  rows={3}
                />
                <button 
                  className={styles.submitReviewBtn}
                  onClick={handleAddReview}
                  disabled={!reviewText.trim()}
                >
                  등록
                </button>
              </div>
            )}

            {allReviews.length > 0 ? (
              allReviews.map((r, i) => <ReviewItem key={i} review={r} novelUrl={url} />)
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

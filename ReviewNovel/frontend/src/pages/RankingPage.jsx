import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import styles from './RankingPage.module.css';

const PLATFORMS = [
  { key: 'kakao',    label: '카카오페이지', color: '#fee500', textColor: '#000' },
  { key: 'naver',    label: '네이버시리즈', color: '#03c75a', textColor: '#fff' },
  { key: 'novelpia', label: '노벨피아',     color: '#e83e2d', textColor: '#fff' },
  { key: 'munpia',   label: '문피아',       color: '#7b5ea7', textColor: '#fff' },
  { key: 'joara',    label: '조아라',       color: '#0073e6', textColor: '#fff' },
];

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='110' viewBox='0 0 80 110'%3E%3Crect width='80' height='110' fill='%231e1b4b'/%3E%3Ctext x='40' y='58' text-anchor='middle' fill='%234a4a8a' font-size='28'%3E📖%3C/text%3E%3C/svg%3E";

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className={`${styles.rankBadge} ${styles.gold}`}>1</span>;
  if (rank === 2) return <span className={`${styles.rankBadge} ${styles.silver}`}>2</span>;
  if (rank === 3) return <span className={`${styles.rankBadge} ${styles.bronze}`}>3</span>;
  return <span className={styles.rankBadge}>{rank}</span>;
}

function NovelCard({ item }) {
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.thumbWrap}>
        <img
          className={styles.thumb}
          src={item.thumbnail || PLACEHOLDER}
          alt={item.title}
          onError={e => { e.target.src = PLACEHOLDER; }}
        />
        <RankBadge rank={item.rank} />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{item.title}</p>
        {item.author && <p className={styles.cardAuthor}>{item.author}</p>}
        {item.rating && (
          <p className={styles.cardRating}>★ {item.rating}</p>
        )}
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.thumbWrap} ${styles.skeletonThumb}`} />
      <div className={styles.cardBody}>
        <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonAuthor}`} />
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [activePlatform, setActivePlatform] = useState('kakao');
  const [items, setItems]       = useState([]);
  const [crawledAt, setCrawledAt] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const fetchRanking = useCallback(async (platform) => {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const res  = await fetch(`/api/ranking/cached?platform=${platform}&limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '랭킹 로딩 실패');
      setItems(data.items || []);
      setCrawledAt(data.crawledAt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRanking(activePlatform); }, [activePlatform, fetchRanking]);

  const platform = PLATFORMS.find(p => p.key === activePlatform);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>웹소설 랭킹</h1>
          {crawledAt && (
            <span className={styles.updatedAt}>업데이트: {timeAgo(crawledAt)}</span>
          )}
        </div>

        {/* Platform tabs */}
        <div className={styles.tabs}>
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              className={`${styles.tab} ${activePlatform === p.key ? styles.tabActive : ''}`}
              style={activePlatform === p.key
                ? { background: p.color, color: p.textColor, borderColor: 'transparent' }
                : {}}
              onClick={() => setActivePlatform(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && !loading && (
          <div className={styles.empty}>
            <p>랭킹 데이터를 불러올 수 없습니다.</p>
            <p className={styles.emptySub}>서버가 시작되면 자동으로 크롤링됩니다.</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && (
          <div className={styles.empty}>
            <p>아직 랭킹 데이터가 없습니다.</p>
            <p className={styles.emptySub}>서버가 시작되면 자동으로 크롤링됩니다.</p>
          </div>
        )}

        {/* Grid */}
        <div className={styles.grid}>
          {loading
            ? Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((item, idx) => <NovelCard key={item.id || idx} item={item} />)
          }
        </div>
      </div>
    </div>
  );
}

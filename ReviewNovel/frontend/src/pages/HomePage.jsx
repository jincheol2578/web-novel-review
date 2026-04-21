import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';
import Navbar from '../components/Navbar';
import CommunityRanking from '../components/CommunityRanking';

const PLATFORMS = [
  { key: 'kakao', label: '카카오페이지' },
  { key: 'naver', label: '네이버 시리즈' },
  { key: 'novelpia', label: '노벨피아' },
  { key: 'munpia', label: '문피아' },
  { key: 'joara', label: '조아라' },
];

export default function HomePage() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  // Ranking state
  const [rankings, setRankings] = useState({});
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState(null);

  const fetchRankings = useCallback(async () => {
    try {
      const res = await fetch('/api/ranking');
      const data = await res.json();
      if (data.rankings) {
        // Store each platform result
        setRankings((prev) => {
          const next = { ...prev };
          data.rankings.forEach((r) => {
            next[r.platformKey] = r;
          });
          return next;
        });
      }
    } catch (err) {
      setRankError(err.message);
    } finally {
      setRankLoading(false);
    }
  }, []);

  // Load rankings on mount
  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Get platform state
  const getPlatformState = (platformKey) => {
    const data = rankings[platformKey];
    if (data) {
      if (data.error) return { status: 'error', error: data.error };
      if (data.rank?.length > 0) return { status: 'success', data };
      return { status: 'empty' };
    }
    return rankLoading ? { status: 'loading' } : { status: 'idle' };
  };

  const handleRankingClick = (url) => {
    if (url) window.open(url, '_blank');
  };

  const handleSearch = () => {
    const novels = input
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!novels.length) return;
    navigate(`/results?novels=${novels.map(encodeURIComponent).join(',')}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSearch();
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <header className={styles.header}>
        <h1 className={styles.title}>웹소설 리뷰</h1>
        <p className={styles.subtitle}>여러 플랫폼의 리뷰와 평점을 한번에</p>
      </header>

      {/* Search */}
      <main className={styles.main}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`소설 제목을 입력하세요\n줄바꿈으로 여러 소설을 한번에 검색할 수 있어요`}
          rows={6}
          autoFocus
        />
        <p className={styles.hint}>Ctrl+Enter 또는 버튼으로 검색</p>
        <button className={styles.button} onClick={handleSearch} disabled={!input.trim()}>
          검색
        </button>
      </main>

      {/* Rankings */}
      <section className={styles.rankingSection}>
        <div className={styles.rankingHeader}>
          <h2 className={styles.rankingTitle}>📊 실시간 인기 순위</h2>
        </div>

        {rankError && <p className={styles.error}>순위 로딩 실패: {rankError}</p>}

        <div className={styles.rankings}>
          {PLATFORMS.map((platform) => {
            const key = platform.key;
            const data = rankings[key];
            const isLoading = rankLoading && !data;
            return (
              <div key={platform.key} className={styles.rankPlatform}>
                <h3 className={styles.rankPlatformTitle}>{platform.label}</h3>
                {(() => {
                  const state = getPlatformState(platform.key);
                  if (state.status === 'loading') {
                    return (
                      <div className={styles.rankSkeleton}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={styles.rankSkeletonRow} />
                        ))}
                      </div>
                    );
                  } else if (state.status === 'error') {
                    return <p className={styles.error}>❌ {state.error}</p>;
                  } else if (state.status === 'success') {
                    const data = state.data;
                    return (
                      <ol className={styles.rankList}>
                        {data.rank.map((item) => (
                          <li key={item.rank} className={styles.rankItem} onClick={() => handleRankingClick(item.url)}>
                            <span className={styles.rankNum}>{item.rank}</span>
                            <span className={styles.rankTitle}>{item.title}</span>
                            {item.rating && (
                              <span className={styles.rankRating}>⭐ {item.rating}</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    );
                  } else if (state.status === 'empty') {
                    return <p className={styles.empty}>순위 데이터가 없습니다.</p>;
                  }
                  return null;
                })()}
              </div>
            );
          })}
        </div>
        <button
          className={styles.refreshButton}
          onClick={fetchRankings}
          disabled={rankLoading}
        >
          🔄 새로고침
        </button>
      </section>

      <CommunityRanking />
    </div>
  );
}

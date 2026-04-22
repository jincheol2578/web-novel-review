import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './HomePage.module.css';
import Navbar from '../components/Navbar';
import CommunityRanking from '../components/CommunityRanking';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='110' viewBox='0 0 80 110'%3E%3Crect width='80' height='110' fill='%231e1b4b'/%3E%3Ctext x='40' y='58' text-anchor='middle' fill='%234a4a8a' font-size='28'%3E📖%3C/text%3E%3C/svg%3E";

const PLATFORMS = [
  { key: 'kakao', label: '카카오페이지', color: '#fee500', textColor: '#000' },
  { key: 'naver', label: '네이버시리즈', color: '#03c75a', textColor: '#fff' },
  { key: 'novelpia', label: '노벨피아', color: '#e83e2d', textColor: '#fff' },
  { key: 'munpia', label: '문피아', color: '#7b5ea7', textColor: '#fff' },
  { key: 'joara', label: '조아라', color: '#0073e6', textColor: '#fff' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Rankings from cache
  const [rankings, setRankings] = useState({});
  const [rankLoading, setRankLoading] = useState(true);

  // Fetch top 3 per platform from cache — single request
  useEffect(() => {
    setRankLoading(true);
    fetch('/api/ranking/cached/all?limit=3')
      .then(r => r.json())
      .then(data => setRankings(data.platforms || {}))
      .catch(() => setRankings({}))
      .finally(() => setRankLoading(false));
  }, []);

  // Autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/novels/autocomplete?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
        setActiveSuggestion(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.contains(e.target) && !suggestionsRef.current?.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTag = (title) => {
    const t = title.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (idx) => setTags(prev => prev.filter((_, i) => i !== idx));

  const handleSearch = () => {
    const allTitles = [...tags];
    if (query.trim()) allTitles.push(query.trim());
    if (!allTitles.length) return;
    navigate(`/results?novels=${allTitles.map(encodeURIComponent).join(',')}`);
  };

  const handleInputKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion(i => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault();
        addTag(suggestions[activeSuggestion].title);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) addTag(query.trim());
      else handleSearch();
    }
    if (e.key === 'Backspace' && !query && tags.length > 0) {
      removeTag(tags.length - 1);
    }
    if (e.key === 'Escape') setShowSuggestions(false);
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
        <div className={styles.searchBox}>
          <div className={styles.tagInput}>
            {tags.map((tag, i) => (
              <span key={i} className={styles.tag}>
                {tag}
                <button className={styles.tagRemove} onClick={() => removeTag(i)}>×</button>
              </span>
            ))}
            <input
              ref={inputRef}
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={tags.length ? '소설 추가...' : '소설 제목 검색 (Enter로 추가, 여러 소설 검색 가능)'}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul ref={suggestionsRef} className={styles.suggestions}>
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className={`${styles.suggestion} ${i === activeSuggestion ? styles.suggestionActive : ''}`}
                  onMouseDown={() => addTag(s.title)}
                >
                  <span className={styles.suggestionTitle}>{s.title}</span>
                  {s.platform && <span className={styles.suggestionPlatform}>{s.platform}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className={styles.hint}>Enter로 소설 추가 · 여러 소설을 한번에 검색할 수 있어요</p>
        <button
          className={styles.button}
          onClick={handleSearch}
          disabled={!tags.length && !query.trim()}
        >
          검색
        </button>
      </main>

      {/* Rankings */}
      <section className={styles.rankingSection}>
        <div className={styles.rankingHeader}>
          <h2 className={styles.rankingTitle}>플랫폼 인기 순위</h2>
          <Link to="/ranking" className={styles.rankingMoreLink}>전체 랭킹 보기 →</Link>
        </div>

        <div className={styles.rankings}>
          {PLATFORMS.map(platform => {
            const items = rankings[platform.key] || [];
            return (
              <div key={platform.key} className={styles.rankPlatform}>
                <div className={styles.rankPlatformHeader}>
                  <span
                    className={styles.rankPlatformBadge}
                    style={{ background: platform.color, color: platform.textColor }}
                  >
                    {platform.label}
                  </span>
                  <Link to="/ranking" className={styles.moreLink}>더보기</Link>
                </div>
                {rankLoading ? (
                  <div className={styles.rankCardRow}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.rankCardSkeleton} />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className={styles.emptyRank}>데이터 없음</p>
                ) : (
                  <div className={styles.rankCardRow}>
                    {items.map(item => (
                      <a
                        key={item.rank}
                        href={item.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.rankCard}
                      >
                        <div className={styles.rankCardThumbWrap}>
                          <img
                            className={styles.rankCardThumb}
                            src={item.thumbnail || PLACEHOLDER}
                            alt={item.title}
                            onError={e => { e.target.src = PLACEHOLDER; }}
                          />
                          <span className={styles.rankCardNum}>{item.rank}</span>
                        </div>
                        <p className={styles.rankCardTitle}>{item.title}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <CommunityRanking />
    </div>
  );
}

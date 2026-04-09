import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { streamSearch } from '../api/search';
import NovelSection from '../components/NovelSection';
import SkeletonCard from '../components/SkeletonCard';
import styles from './ResultsPage.module.css';

const PLATFORMS = ['kakao', 'naver', 'munpia', 'novelpia', 'joara'];

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const novels = (searchParams.get('novels') || '')
    .split(',')
    .map(decodeURIComponent)
    .filter(Boolean);

  // results: { [novelTitle]: { platforms: { [platformKey]: platformData } } }
  const [results, setResults] = useState(() =>
    Object.fromEntries(novels.map((t) => [t, { platforms: {} }]))
  );
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!novels.length) return;

    const close = streamSearch(novels, (event) => {
      if (event.type === 'platform_result') {
        const { novelTitle, platform } = event;
        setResults((prev) => ({
          ...prev,
          [novelTitle]: {
            platforms: {
              ...(prev[novelTitle]?.platforms || {}),
              [platform.platformKey]: platform,
            },
          },
        }));
      } else if (event.type === 'done') {
        setDone(true);
      } else if (event.type === 'error') {
        setError(event.message);
        setDone(true);
      }
    });

    closeRef.current = close;
    return () => close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = novels.reduce((acc, title) => {
    const platformsDone = Object.keys(results[title]?.platforms || {}).length;
    return acc + (PLATFORMS.length - platformsDone);
  }, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← 새 검색</Link>
        <div className={styles.status}>
          {done
            ? `${novels.length}개 소설 검색 완료`
            : `검색 중... (${PLATFORMS.length * novels.length - pendingCount}/${PLATFORMS.length * novels.length})`}
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <main className={styles.main}>
        {novels.map((title) => (
          <div key={title} className={styles.novelBlock}>
            <h2 className={styles.novelTitle}>{title}</h2>
            <NovelSection
              platforms={results[title]?.platforms || {}}
              pendingPlatforms={PLATFORMS.filter(
                (p) => !results[title]?.platforms[p]
              )}
              done={done}
              novelTitle={title}
            />
          </div>
        ))}
      </main>
    </div>
  );
}

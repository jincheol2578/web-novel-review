import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from './CommunityRanking.module.css';

export default function CommunityRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('ratings').select('novel_title, score');
        if (!data || data.length === 0) return;

        const map = {};
        for (const row of data) {
          if (!map[row.novel_title]) map[row.novel_title] = [];
          map[row.novel_title].push(row.score);
        }

        const ranked = Object.entries(map)
          .map(([title, scores]) => ({
            title,
            avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
            count: scores.length,
          }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 10)
          .map((item, i) => ({ ...item, rank: i + 1 }));

        setRanking(ranked);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || ranking.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>⭐ 유저 평점 TOP 10</h2>
      <ol className={styles.list}>
        {ranking.map(item => (
          <li key={item.title} className={styles.item}>
            <span className={styles.rank}>{item.rank}</span>
            <span className={styles.novelTitle}>{item.title}</span>
            <span className={styles.avg}>{item.avg}<small>/10</small></span>
            <span className={styles.count}>({item.count}명)</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

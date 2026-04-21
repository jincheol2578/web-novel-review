import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useRatings(novelTitle) {
  const { user } = useAuth();
  const [myRating, setMyRating] = useState(null);
  const [avgRating, setAvgRating] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    if (!novelTitle) return;
    setLoading(true);
    try {
      const { data: all } = await supabase
        .from('ratings')
        .select('score, user_id')
        .eq('novel_title', novelTitle);

      if (all && all.length > 0) {
        setTotalCount(all.length);
        setAvgRating((all.reduce((s, r) => s + r.score, 0) / all.length).toFixed(1));
        if (user) {
          const own = all.find(r => r.user_id === user.id);
          setMyRating(own?.score ?? null);
        }
      } else {
        setTotalCount(0);
        setAvgRating(null);
        setMyRating(null);
      }
    } finally {
      setLoading(false);
    }
  }, [novelTitle, user]);

  const upsertRating = async (score) => {
    if (!user || !novelTitle) return;
    const { error } = await supabase.from('ratings').upsert(
      { user_id: user.id, novel_title: novelTitle, score },
      { onConflict: 'user_id,novel_title' }
    );
    if (!error) {
      setMyRating(score);
      fetchRatings();
    }
  };

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  return { myRating, avgRating, totalCount, loading, upsertRating };
}

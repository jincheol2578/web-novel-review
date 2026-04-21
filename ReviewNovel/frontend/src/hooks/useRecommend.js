import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useRecommend() {
  const { session } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecommendations = useCallback(async (ratingsArray) => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ratings: ratingsArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '추천 실패');
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { recommendations, loading, error, fetchRecommendations };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useReviews(novelTitle, platformKey) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (!novelTitle || !platformKey) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('novel_title', novelTitle)
        .eq('platform_key', platformKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('리뷰 로딩 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [novelTitle, platformKey]);

  const addReview = async ({ content, authorName = '익명', rating }) => {
    if (!novelTitle || !platformKey || !content) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          novel_title: novelTitle,
          platform_key: platformKey,
          content,
          author_name: authorName || '익명',
          rating: rating || null,
          user_id: user?.id || null,
        }])
        .select()
        .single();

      if (error) throw error;
      setReviews(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('[useReviews] 리뷰 추가 오류:', err);
      throw err;
    }
  };

  const updateReview = async (id, content) => {
    const { error } = await supabase
      .from('reviews')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, content } : r));
    }
  };

  const deleteReview = async (id) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  useEffect(() => {
    if (!novelTitle || !platformKey) return;
    fetchReviews();

    const channel = supabase
      .channel(`reviews-${novelTitle}-${platformKey}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
        filter: `novel_title=eq.${encodeURIComponent(novelTitle)} AND platform_key=eq.${platformKey}`
      }, (payload) => {
        setReviews(prev => {
          if (prev.some(r => r.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReviews, novelTitle, platformKey]);

  return { reviews, loading, error, addReview, updateReview, deleteReview, refetch: fetchReviews };
}

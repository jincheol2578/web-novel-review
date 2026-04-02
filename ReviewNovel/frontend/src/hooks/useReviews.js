import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useReviews(novelTitle, platformKey) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 리뷰 불러오기
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

  // 리뷰 추가하기
  const addReview = async ({ content, authorName = '익명', rating }) => {
    if (!novelTitle || !platformKey || !content) {
      console.error('[useReviews] 필수 데이터 누락:', { novelTitle, platformKey, content });
      return;
    }

    console.log('[useReviews] 리뷰 저장 시도:', { novelTitle, platformKey, content });

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          novel_title: novelTitle,
          platform_key: platformKey,
          content,
          author_name: authorName || '익명',
          rating: rating || null
        }])
        .select()
        .single();

      if (error) {
        console.error('[useReviews] Supabase 저장 오류:', error);
        throw error;
      }
      
      console.log('[useReviews] 저장 성공:', data);
      // 추가된 리뷰를 로컬 상태에 반영
      setReviews(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('[useReviews] 리뷰 추가 최종 오류:', err);
      throw err;
    }
  };

  // 초기 로딩 및 실시간 구독
  useEffect(() => {
    if (!novelTitle || !platformKey) return;

    fetchReviews();

    // 실시간 변경 사항 구독
    const channel = supabase
      .channel(`reviews-${novelTitle}-${platformKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `novel_title=eq.${encodeURIComponent(novelTitle)} AND platform_key=eq.${platformKey}`
        },
        (payload) => {
          setReviews(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReviews, novelTitle, platformKey]);

  return { reviews, loading, error, addReview, refetch: fetchReviews };
}

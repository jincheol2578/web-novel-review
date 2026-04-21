import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRecommend } from '../hooks/useRecommend';
import Navbar from '../components/Navbar';
import styles from './MyPage.module.css';

const TABS = ['프로필', '댓글 관리', '평점 이력', 'AI 추천'];

export default function MyPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [myReviews, setMyReviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [myRatings, setMyRatings] = useState([]);

  const { recommendations, loading: recLoading, error: recError, fetchRecommendations } = useRecommend();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }) => setDisplayName(data?.display_name || user.email || ''));
    loadMyReviews();
    loadMyRatings();
  }, [user]);

  const loadMyReviews = async () => {
    const { data } = await supabase.from('reviews').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    setMyReviews(data || []);
  };

  const loadMyRatings = async () => {
    const { data } = await supabase.from('ratings').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    setMyRatings(data || []);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    await supabase.from('profiles').upsert({ id: user.id, display_name: displayName });
    setSavingProfile(false);
    alert('저장되었습니다.');
  };

  const startEdit = (review) => {
    setEditingId(review.id);
    setEditContent(review.content);
  };

  const saveEdit = async (id) => {
    await supabase.from('reviews')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', id);
    setEditingId(null);
    setMyReviews(prev => prev.map(r => r.id === id ? { ...r, content: editContent } : r));
  };

  const deleteReview = async (id) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    setMyReviews(prev => prev.filter(r => r.id !== id));
  };

  const deleteRating = async (id) => {
    if (!confirm('평점을 삭제할까요?')) return;
    await supabase.from('ratings').delete().eq('id', id);
    setMyRatings(prev => prev.filter(r => r.id !== id));
  };

  const handleRecommend = () => {
    if (myRatings.length === 0) { alert('평점을 남긴 소설이 없습니다.'); return; }
    fetchRecommendations(myRatings.map(r => ({ title: r.novel_title, score: r.score })));
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.inner}>
        <h1 className={styles.pageTitle}>마이페이지</h1>

        <div className={styles.tabs}>
          {TABS.map((t, i) => (
            <button key={t}
              className={`${styles.tab} ${activeTab === i ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(i)}>
              {t}
            </button>
          ))}
        </div>

        {/* 프로필 */}
        {activeTab === 0 && (
          <div className={styles.section}>
            <label className={styles.label}>이메일</label>
            <p className={styles.email}>{user?.email}</p>
            <label className={styles.label}>닉네임</label>
            <input className={styles.input} value={displayName}
              onChange={e => setDisplayName(e.target.value)} />
            <button className={styles.saveBtn} onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {/* 댓글 관리 */}
        {activeTab === 1 && (
          <div className={styles.section}>
            {myReviews.length === 0
              ? <p className={styles.empty}>작성한 댓글이 없습니다.</p>
              : myReviews.map(r => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewNovel}>{r.novel_title}</span>
                    <span className={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {editingId === r.id ? (
                    <div className={styles.editArea}>
                      <textarea className={styles.editTextarea} value={editContent}
                        onChange={e => setEditContent(e.target.value)} rows={3} />
                      <div className={styles.rowActions}>
                        <button className={styles.saveBtn} onClick={() => saveEdit(r.id)}>저장</button>
                        <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.reviewContent}>{r.content}</p>
                  )}
                  {editingId !== r.id && (
                    <div className={styles.rowActions}>
                      <button className={styles.editBtn} onClick={() => startEdit(r)}>수정</button>
                      <button className={styles.deleteBtn} onClick={() => deleteReview(r.id)}>삭제</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {/* 평점 이력 */}
        {activeTab === 2 && (
          <div className={styles.section}>
            {myRatings.length === 0
              ? <p className={styles.empty}>평점을 남긴 소설이 없습니다.</p>
              : myRatings.map(r => (
                <div key={r.id} className={styles.ratingCard}>
                  <span className={styles.ratingNovel}>{r.novel_title}</span>
                  <div className={styles.ratingRight}>
                    <span className={styles.ratingScore}>{r.score}<small>/10</small></span>
                    <button className={styles.deleteBtn} onClick={() => deleteRating(r.id)}>삭제</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* AI 추천 */}
        {activeTab === 3 && (
          <div className={styles.section}>
            <p className={styles.desc}>
              내가 남긴 {myRatings.length}개의 평점을 기반으로 AI가 소설을 추천해드립니다.
            </p>
            <button className={styles.recommendBtn} onClick={handleRecommend} disabled={recLoading}>
              {recLoading ? '추천 생성 중...' : '🤖 AI 추천 받기'}
            </button>
            {recError && <p className={styles.error}>{recError}</p>}
            {recommendations.length > 0 && (
              <div className={styles.recList}>
                {recommendations.map((r, i) => (
                  <div key={i} className={styles.recCard}>
                    <div className={styles.recTop}>
                      <span className={styles.recRank}>{i + 1}</span>
                      <span className={styles.recTitle}>{r.title}</span>
                      {r.genre && <span className={styles.recGenre}>{r.genre}</span>}
                    </div>
                    {r.reason && <p className={styles.recReason}>{r.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

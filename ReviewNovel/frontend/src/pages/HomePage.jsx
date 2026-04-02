import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

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
      <header className={styles.header}>
        <h1 className={styles.title}>웹소설 리뷰</h1>
        <p className={styles.subtitle}>여러 플랫폼의 리뷰와 평점을 한번에</p>
      </header>
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
    </div>
  );
}

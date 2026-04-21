import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, signIn, signOut, loading } = useAuth();

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>웹소설 리뷰</Link>
      <div className={styles.actions}>
        {!loading && (
          user ? (
            <>
              <Link to="/mypage" className={styles.link}>마이페이지</Link>
              <button className={styles.btn} onClick={signOut}>로그아웃</button>
            </>
          ) : (
            <button className={styles.btn} onClick={signIn}>Google 로그인</button>
          )
        )}
      </div>
    </nav>
  );
}

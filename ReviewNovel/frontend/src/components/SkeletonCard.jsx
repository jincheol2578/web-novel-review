import styles from './SkeletonCard.module.css';

export default function SkeletonCard({ label }) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <div className={styles.shimmer} style={{ width: '60px', height: '14px' }} />
      </div>
      <div className={styles.shimmer} style={{ width: '70%', height: '13px' }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.reviewSkeleton}>
          <div className={styles.shimmer} style={{ width: '100%', height: '12px' }} />
          <div className={styles.shimmer} style={{ width: '85%', height: '12px' }} />
          <div className={styles.shimmer} style={{ width: '40%', height: '10px', marginTop: '4px' }} />
        </div>
      ))}
    </div>
  );
}

import styles from './RatingWidget.module.css';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RatingWidget({ value, onChange, readonly = false }) {
  return (
    <div className={styles.widget}>
      <span className={styles.label}>내 평점</span>
      <div className={styles.scores}>
        {SCORES.map(s => (
          <button
            key={s}
            type="button"
            className={`${styles.score} ${value === s ? styles.active : ''} ${value && s <= value ? styles.filled : ''}`}
            onClick={() => !readonly && onChange?.(s)}
            disabled={readonly}
          >
            {s}
          </button>
        ))}
      </div>
      {value != null && <span className={styles.selected}>{value}<small>/10</small></span>}
    </div>
  );
}

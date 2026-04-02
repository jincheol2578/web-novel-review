import styles from './ReviewItem.module.css';

export default function ReviewItem({ review }) {
  const { text, author, date } = review;

  return (
    <div className={styles.item}>
      <p className={styles.text}>{text || '(내용 없음)'}</p>
      <div className={styles.meta}>
        {author && <span className={styles.author}>{author}</span>}
        {date && <span className={styles.date}>{date}</span>}
      </div>
    </div>
  );
}

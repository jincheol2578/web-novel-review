import styles from './ReviewItem.module.css';

export default function ReviewItem({ review, novelUrl }) {
  const { text, author, date, url } = review;
  const linkUrl = url || novelUrl;

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.item}
    >
      <p className={styles.text}>{text || '(내용 없음)'}</p>
      <div className={styles.meta}>
        {author && <span className={styles.author}>{author}</span>}
        {date && <span className={styles.date}>{date}</span>}
      </div>
    </a>
  );
}

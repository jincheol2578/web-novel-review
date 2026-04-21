import { useState } from 'react';
import styles from './ReviewItem.module.css';

export default function ReviewItem({ review, currentUserId, onUpdate, onDelete }) {
  const { text, author, date, isDbReview, user_id, id } = review;
  const isOwner = isDbReview && currentUserId && user_id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');

  const handleSave = async () => {
    await onUpdate?.(id, editText);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditText(text || '');
  };

  return (
    <div className={styles.item}>
      {editing ? (
        <textarea
          className={styles.editArea}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          rows={3}
        />
      ) : (
        <p className={styles.text}>{text || '(내용 없음)'}</p>
      )}
      <div className={styles.meta}>
        <div className={styles.metaLeft}>
          {author && <span className={styles.author}>{author}</span>}
          {date && <span className={styles.date}>{date}</span>}
        </div>
        {isOwner && !editing && (
          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => setEditing(true)}>수정</button>
            <button className={styles.deleteBtn} onClick={() => onDelete?.(id)}>삭제</button>
          </div>
        )}
        {editing && (
          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave}>저장</button>
            <button className={styles.cancelBtn} onClick={handleCancel}>취소</button>
          </div>
        )}
      </div>
    </div>
  );
}

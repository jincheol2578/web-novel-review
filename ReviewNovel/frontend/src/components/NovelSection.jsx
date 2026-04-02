import PlatformCard from './PlatformCard';
import SkeletonCard from './SkeletonCard';
import styles from './NovelSection.module.css';

const PLATFORM_LABELS = {
  kakao: '카카오페이지',
  naver: '네이버 시리즈',
  munpia: '문피아',
  novelpia: '노벨피아',
  joara: '조아라',
};

export default function NovelSection({ platforms, pendingPlatforms, done }) {
  const allKeys = Object.keys(PLATFORM_LABELS);

  return (
    <div className={styles.grid}>
      {allKeys.map((key) => {
        const data = platforms[key];
        if (data) {
          return <PlatformCard key={key} data={data} />;
        }
        if (!done && pendingPlatforms.includes(key)) {
          return <SkeletonCard key={key} label={PLATFORM_LABELS[key]} />;
        }
        return null;
      })}
    </div>
  );
}

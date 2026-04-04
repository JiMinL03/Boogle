import styles from './ViewToggle.module.css'

export default function ViewToggle({ viewMode, onChange }) {
  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${viewMode === 'globe' ? styles.active : ''}`}
        onClick={() => onChange('globe')}
        title="3D 구체 보기"
      >
        <span className={styles.icon}>🌐</span> 3D
      </button>
      <button
        className={`${styles.btn} ${viewMode === 'mercator' ? styles.active : ''}`}
        onClick={() => onChange('mercator')}
        title="2D 평면 보기"
      >
        <span className={styles.icon}>🗺</span> 2D
      </button>
    </div>
  )
}

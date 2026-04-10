import styles from './ControlsHint.module.css'

const HINTS = [
  { key: '드래그',         desc: '지구 이동',    cls: 'blue'   },
  { key: '우클릭 드래그',  desc: '회전 · 기울기', cls: 'teal'   },
  { key: '스크롤',         desc: '줌',           cls: 'yellow' },
  { key: '마커 클릭',      desc: '해로 정보',    cls: 'orange' },
]

export default function ControlsHint() {
  return (
    <div className={styles.bar}>
      {HINTS.map(({ key, desc, cls }) => (
        <div key={key} className={styles.item}>
          <span className={`${styles.key} ${styles[cls]}`}>{key}</span>
          <span className={styles.desc}>{desc}</span>
        </div>
      ))}
    </div>
  )
}

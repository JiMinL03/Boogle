import styles from './ControlsHint.module.css'

const HINTS = [
  { key: '드래그',       desc: '지구 회전', cls: 'orange' },
  { key: '우클릭 드래그', desc: '시점 이동', cls: 'blue'   },
  { key: '스크롤',       desc: '줌',       cls: 'teal'   },
  { key: 'Ctrl + 드래그', desc: '기울기',   cls: 'yellow' },
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

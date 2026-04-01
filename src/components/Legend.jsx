import styles from './Legend.module.css'
import { COLOR } from '../constants/colors'

const ITEMS = [
  { type: 'canal',  label: '운하 (Canal)'    },
  { type: 'strait', label: '해협 (Strait)'   },
  { type: 'cape',   label: '갑 / 해로 (Cape)' },
]

export default function Legend() {
  return (
    <div className={styles.legend}>
      <div className={styles.title}>마커 범례</div>
      {ITEMS.map(({ type, label }) => (
        <div key={type} className={styles.item}>
          <span
            className={styles.dot}
            style={{
              background: COLOR[type].hex,
              boxShadow: `0 0 8px ${COLOR[type].hex}99`,
            }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

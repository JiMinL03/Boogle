import styles from './Legend.module.css'
import { COLOR } from '../constants/colors'
import { ROUTES } from '../data/routes'

const MARKER_ITEMS = [
  { type: 'canal',  label: '운하 (Canal)'    },
  { type: 'strait', label: '해협 (Strait)'   },
  { type: 'cape',   label: '갑 / 해로 (Cape)' },
]

export default function Legend() {
  return (
    <div className={styles.legend}>
      {/* 항로 범례 */}
      <div className={styles.title}>항로</div>
      {ROUTES.map(route => (
        <div key={route.id} className={styles.item}>
          <span
            className={styles.line}
            style={{ background: route.color, boxShadow: `0 0 6px ${route.color}99` }}
          />
          <span>{route.name_ko}</span>
        </div>
      ))}

      {/* 마커 범례 */}
      <div className={styles.divider} />
      <div className={styles.title}>마커</div>
      {MARKER_ITEMS.map(({ type, label }) => (
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

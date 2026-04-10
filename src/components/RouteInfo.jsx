import { ROUTES } from '../data/routes'
import styles from './RouteInfo.module.css'

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function routeDistanceKm(coords) {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
  }
  return total
}

export default function RouteInfo({ routeId }) {
  const route  = ROUTES.find(r => r.id === routeId)
  if (!route) return null

  const distKm  = Math.round(routeDistanceKm(route.coords))
  const distNm  = Math.round(distKm / 1.852)
  const etaDays = (distNm / 16 / 24).toFixed(1)

  return (
    <div className={styles.card}>
      <div className={styles.label}>항로</div>
      <div className={styles.name}>{route.name_ko}</div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{distKm.toLocaleString()}</span>
          <span className={styles.statUnit}>km</span>
        </div>
        <span className={styles.divider}>·</span>
        <div className={styles.stat}>
          <span className={styles.statNum}>{distNm.toLocaleString()}</span>
          <span className={styles.statUnit}>해리</span>
        </div>
        <span className={styles.divider}>·</span>
        <div className={styles.stat}>
          <span className={styles.statNum}>~{etaDays}</span>
          <span className={styles.statUnit}>일</span>
        </div>
      </div>
    </div>
  )
}

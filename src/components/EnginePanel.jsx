import { ROUTES } from '../data/routes'
import { SHIP }   from '../constants/ship'
import styles from './EnginePanel.module.css'

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
  let t = 0
  for (let i = 1; i < coords.length; i++)
    t += haversineKm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
  return t
}

export default function EnginePanel({ routeId, elapsedMs, isRunning }) {
  const route  = ROUTES.find(r => r.id === routeId)
  const distNm = route ? routeDistanceKm(route.coords) / 1.852 : null

  const totalVoyageHours = distNm ? distNm / SHIP.knots : null
  const elapsedHours     = elapsedMs / 3_600_000

  const consumedTon     = elapsedHours * SHIP.fuelTonPerHour
  const expectedTon     = totalVoyageHours ? totalVoyageHours * SHIP.fuelTonPerHour : null
  const remainingTon    = expectedTon != null ? Math.max(0, expectedTon - consumedTon) : null
  const progressPct     = expectedTon ? Math.min(100, (consumedTon / expectedTon) * 100) : 0

  const hasData = elapsedMs > 0

  return (
    <div className={styles.panel}>
      <section className={styles.section}>

        {/* ── 헤더 ── */}
        <div className={styles.sectionLabel}>
          엔진 소모량
          {isRunning && <span className={styles.liveDot} />}
        </div>

        {/* ── 기준 소비율 ── */}
        <div className={styles.rateRow}>
          <span className={styles.rateNum}>{SHIP.fuelTonPerHour}</span>
          <span className={styles.rateUnit}>ton/hr</span>
          <span className={styles.dot}>·</span>
          <span className={styles.rateNum}>{SHIP.fuelTonPerDay.toFixed(1)}</span>
          <span className={styles.rateUnit}>ton/day</span>
        </div>

        {/* ── 소모량 데이터 ── */}
        {hasData && (
          <>
            <div className={styles.divider} />

            <div className={styles.grid}>
              <Cell label="현재 소모량"   val={consumedTon.toFixed(1)}              unit="ton" accent />
              {expectedTon   != null && <Cell label="예상 총 소모량" val={expectedTon.toFixed(1)}   unit="ton" />}
              {remainingTon  != null && <Cell label="잔여 소모량"   val={remainingTon.toFixed(1)}  unit="ton" />}
              <Cell label="일일 소비율"   val={SHIP.fuelTonPerDay.toFixed(1)}        unit="ton" />
            </div>

            {/* ── 진행률 바 ── */}
            {expectedTon != null && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
                <span className={styles.progressLabel}>{progressPct.toFixed(1)}% 소모</span>
              </div>
            )}
          </>
        )}

        {!hasData && (
          <div className={styles.empty}>항해 시작 후 실시간으로 계산됩니다</div>
        )}

      </section>
    </div>
  )
}

function Cell({ label, val, unit, accent }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellVal}>
        <span className={`${styles.cellNum} ${accent ? styles.accent : ''}`}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
      </span>
    </div>
  )
}

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

  const consumedTon  = elapsedHours * SHIP.fuelTonPerHour
  const expectedTon  = totalVoyageHours ? totalVoyageHours * SHIP.fuelTonPerHour : null
  const remainingTon = expectedTon != null ? Math.max(0, expectedTon - consumedTon) : null
  const progressPct  = expectedTon ? Math.min(100, (consumedTon / expectedTon) * 100) : 0

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
              <Cell label="현재 소모량"   val={consumedTon.toFixed(1)}             unit="ton" accent />
              {expectedTon  != null && <Cell label="예상 총 소모량" val={expectedTon.toFixed(1)}  unit="ton" />}
              {remainingTon != null && <Cell label="잔여 소모량"    val={remainingTon.toFixed(1)} unit="ton" />}
              <Cell label="일일 소비율" val={SHIP.fuelTonPerDay.toFixed(1)} unit="ton" />
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

        {/* ── 발라스트 탱크 다이어그램 ── */}
        <BallastDiagram
          progressPct={progressPct}
          consumedTon={hasData ? consumedTon : null}
          expectedTon={expectedTon}
        />

      </section>
    </div>
  )
}

// ── 발라스트 탱크 SVG 다이어그램 ─────────────────────────
// 위쪽이 더 넓은 비대칭 팔각형 (실제 탱크 형태 반영)
const TANK = "M 62,14 L 218,14 L 276,58 L 276,148 L 248,180 L 32,180 L 4,148 L 4,58 Z"
const T_TOP = 14, T_BOTTOM = 180  // 탱크 상·하단 y좌표

function BallastDiagram({ progressPct, consumedTon, expectedTon }) {
  const pct       = Math.min(100, Math.max(0, progressPct ?? 0))
  // 처음 가득 찬 상태 → 소모될수록 줄어듦
  const remainFrac = 1 - pct / 100
  const tankH      = T_BOTTOM - T_TOP          // 166
  const fillH      = tankH * remainFrac
  const fillY      = (T_BOTTOM - fillH).toFixed(1)
  const waveY      = (T_BOTTOM - fillH - 2).toFixed(1)
  const waveYd     = (T_BOTTOM - fillH + 3).toFixed(1)

  return (
    <svg viewBox="0 0 280 192" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: 'auto', display: 'block', marginTop: 14 }}>
      <defs>
        <clipPath id="tankClip">
          <path d={TANK} />
        </clipPath>
        <linearGradient id="fuelGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#cc3300" stopOpacity="1"    />
          <stop offset="60%"  stopColor="#ff5900" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ff9944" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* 탱크 배경 */}
      <path d={TANK} fill="#070f18" stroke="#2a5a80" strokeWidth="1.5" />

      {/* 주황 fill (하단 고정, 위로 줄어듦) */}
      {fillH > 1 && (
        <rect x="0" y={fillY} width="280" height={fillH + 8}
              fill="url(#fuelGrad)" clipPath="url(#tankClip)" />
      )}

      {/* 액면 파동선 */}
      {fillH > 4 && remainFrac < 0.99 && (
        <path d={`M 4,${waveY} C 90,${waveYd} 190,${waveY} 276,${waveYd}`}
              fill="none" stroke="rgba(255,160,70,0.6)" strokeWidth="1.8"
              clipPath="url(#tankClip)" />
      )}

      {/* 탱크 테두리 (fill 위에 다시 그려 선명하게) */}
      <path d={TANK} fill="none" stroke="#3a7ab0" strokeWidth="1.5" />

      {/* 중앙 수치 */}
      <text x="140" y="96" textAnchor="middle" fill="#ff5900"
            fontSize="28" fontWeight="700"
            fontFamily="'SF Mono','Fira Code','Consolas',monospace">
        {consumedTon != null ? consumedTon.toFixed(1) : '--'}
      </text>
      <text x="140" y="113" textAnchor="middle"
            fill="rgba(255,255,255,0.32)" fontSize="10">ton 소모</text>
      {expectedTon != null && (
        <text x="140" y="131" textAnchor="middle"
              fill="rgba(255,255,255,0.18)" fontSize="10">
          / {expectedTon.toFixed(1)} ton
        </text>
      )}

      {/* 발라스트 탱크 라벨 */}
      <text x="140" y="163" textAnchor="middle"
            fill="rgba(100,180,220,0.3)" fontSize="8" fontWeight="700" letterSpacing="2">
        BALLAST TANK
      </text>
    </svg>
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

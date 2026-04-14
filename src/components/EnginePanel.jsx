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
        <div className={styles.sectionLabel}>
          엔진 소모량
          {isRunning && <span className={styles.liveDot} />}
        </div>
        <div className={styles.rateRow}>
          <span className={styles.rateNum}>{SHIP.fuelTonPerHour}</span>
          <span className={styles.rateUnit}>ton/hr</span>
        </div>
        <BallastDiagram
          progressPct={progressPct}
          remainingTon={hasData ? remainingTon : null}
          expectedTon={expectedTon}
        />
      </section>
    </div>
  )
}

// ── LNG 원통형 탱크 상수 ──────────────────────────────────
const TANK_CX     = 340
const TANK_TOP    = 150
const TANK_BOTTOM = 530
const TANK_RX     = 125
const TANK_RY     = 24
const BODY_X      = TANK_CX - TANK_RX
const BODY_W      = TANK_RX * 2
const BODY_H      = TANK_BOTTOM - TANK_TOP
const CAP_TOP     = { cx: TANK_CX, cy: TANK_TOP,    rx: TANK_RX, ry: TANK_RY }
const CAP_BOTTOM  = { cx: TANK_CX, cy: TANK_BOTTOM, rx: TANK_RX, ry: TANK_RY }
const RAIL_RX     = 132
const RAIL_RY     = 26
const RAIL_BOTTOM = TANK_TOP
const RAIL_TOP    = TANK_TOP - 42
const POSTS       = [210, 250, 295, 340, 385, 430, 470]
const POST_TOP_Y  = [112,  93,  82,  78,  82,  93, 112]
const DOM_STEM    = { x: 334, y: RAIL_TOP - 38, w: 12, h: 30 }
const DOM_BALL    = { cx: TANK_CX, cy: 60, r: 14 }
const VB = "0 0 680 580"

function BallastDiagram({ progressPct, remainingTon, expectedTon }) {
  const pct        = Math.min(100, Math.max(0, progressPct ?? 0))
  const remainFrac = 1 - pct / 100
  const fillH      = BODY_H * remainFrac
  const fillY      = TANK_BOTTOM - fillH
  const waveRY     = TANK_RY * 0.8
  const waveY      = fillY
  const textCY     = TANK_TOP + BODY_H / 2

  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: 'auto', display: 'block', marginTop: 10 }}>
      <defs>
        <clipPath id="lngClip">
          <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H} />
          <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy} rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry} />
        </clipPath>
        <linearGradient id="lngFuelGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#cc3300" stopOpacity="1"    />
          <stop offset="60%"  stopColor="#ff5900" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ff9944" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="lngBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(58,122,176,0.18)" />
          <stop offset="40%"  stopColor="rgba(100,180,220,0.06)" />
          <stop offset="100%" stopColor="rgba(58,122,176,0.22)" />
        </linearGradient>
      </defs>

      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H} fill="#070f18" />
      {fillH > 1 && (
        <rect x={BODY_X} y={fillY} width={BODY_W} height={fillH + CAP_BOTTOM.ry}
              fill="url(#lngFuelGrad)" clipPath="url(#lngClip)" />
      )}
      {fillH > 4 && remainFrac < 0.99 && (
        <ellipse cx={TANK_CX} cy={waveY} rx={TANK_RX - 1} ry={waveRY}
                 fill="rgba(255,160,70,0.18)"
                 stroke="rgba(255,160,70,0.7)" strokeWidth="2"
                 clipPath="url(#lngClip)" />
      )}
      <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy}
               rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry}
               fill={fillH >= BODY_H ? "url(#lngFuelGrad)" : "#070f18"}
               stroke="#3a7ab0" strokeWidth="2" />
      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H}
            fill="url(#lngBodyGrad)" stroke="#3a7ab0" strokeWidth="2" />
      <ellipse cx={CAP_TOP.cx} cy={CAP_TOP.cy}
               rx={CAP_TOP.rx} ry={CAP_TOP.ry}
               fill="#0a1520" stroke="#3a7ab0" strokeWidth="2" />
      {POSTS.map((px, i) => (
        <line key={i} x1={px} y1={POST_TOP_Y[i]} x2={px} y2={RAIL_BOTTOM}
              stroke="rgba(100,180,220,0.4)" strokeWidth="2.5" />
      ))}
      <ellipse cx={TANK_CX} cy={RAIL_TOP} rx={RAIL_RX} ry={RAIL_RY}
               fill="none" stroke="rgba(100,180,220,0.5)" strokeWidth="2.5" />
      <ellipse cx={TANK_CX} cy={RAIL_BOTTOM} rx={RAIL_RX} ry={RAIL_RY}
               fill="none" stroke="rgba(100,180,220,0.3)" strokeWidth="1.5" />
      <rect x={DOM_STEM.x} y={DOM_STEM.y} width={DOM_STEM.w} height={DOM_STEM.h}
            fill="rgba(100,180,220,0.5)" rx="3" />
      <circle cx={DOM_BALL.cx} cy={DOM_BALL.cy} r={DOM_BALL.r}
              fill="#0a1520" stroke="rgba(100,180,220,0.7)" strokeWidth="2.5" />

      <text x={TANK_CX} y={textCY - 20} textAnchor="middle" fill="#ffffff"
            fontSize="52" fontWeight="700"
            fontFamily="'SF Mono','Fira Code','Consolas',monospace">
        {remainingTon != null ? remainingTon.toFixed(1) : '--'}
      </text>
      <text x={TANK_CX} y={textCY + 14} textAnchor="middle"
            fill="rgba(255,255,255,0.32)" fontSize="20">ton 잔여</text>
      {expectedTon != null && (
        <text x={TANK_CX} y={textCY + 42} textAnchor="middle"
              fill="rgba(255,255,255,0.18)" fontSize="18">
          / {expectedTon.toFixed(1)} ton
        </text>
      )}
      <text x={TANK_CX} y={TANK_BOTTOM + 38} textAnchor="middle"
            fill="rgba(100,180,220,0.3)" fontSize="16" fontWeight="700" letterSpacing="4">
        LNG TANK
      </text>
    </svg>
  )
}

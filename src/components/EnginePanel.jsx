import { useState } from 'react'
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
  const [tab, setTab] = useState('fuel')

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

        {/* ── 탭 헤더 ── */}
        <div className={styles.tabRow}>
          <button
            className={`${styles.tab} ${tab === 'fuel' ? styles.tabActive : ''}`}
            onClick={() => setTab('fuel')}
          >
            연료
          </button>
          <button
            className={`${styles.tab} ${tab === 'cargo' ? styles.tabActive : ''}`}
            onClick={() => setTab('cargo')}
          >
            Cargo
          </button>
          {tab === 'fuel' && isRunning && <span className={styles.liveDot} />}
        </div>

        {/* ══ 연료 탭 ══ */}
        {tab === 'fuel' && (
          <>
            <div className={styles.rateRow}>
              <span className={styles.rateNum}>{SHIP.fuelTonPerHour}</span>
              <span className={styles.rateUnit}>ton/hr</span>
              <span className={styles.dot}>·</span>
              <span className={styles.rateNum}>{SHIP.fuelTonPerDay.toFixed(1)}</span>
              <span className={styles.rateUnit}>ton/day</span>
            </div>

            {hasData && (
              <>
                <div className={styles.divider} />
                <div className={styles.grid}>
                  <Cell label="현재 소모량"   val={consumedTon.toFixed(1)}            unit="ton" accent />
                  {expectedTon != null && <Cell label="예상 총 소모량" val={expectedTon.toFixed(1)} unit="ton" />}
                </div>
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

            <BallastDiagram
              progressPct={progressPct}
              remainingTon={hasData ? remainingTon : null}
              expectedTon={expectedTon}
            />
          </>
        )}

        {/* ══ Cargo 탭 ══ */}
        {tab === 'cargo' && (
          <CargoDiagram />
        )}

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
const BODY_X      = TANK_CX - TANK_RX         // 215
const BODY_W      = TANK_RX * 2               // 250
const BODY_H      = TANK_BOTTOM - TANK_TOP    // 380
const CAP_TOP     = { cx: TANK_CX, cy: TANK_TOP,    rx: TANK_RX, ry: TANK_RY }
const CAP_BOTTOM  = { cx: TANK_CX, cy: TANK_BOTTOM, rx: TANK_RX, ry: TANK_RY }
const RAIL_RX     = 132
const RAIL_RY     = 26
const RAIL_BOTTOM = TANK_TOP
const RAIL_TOP    = TANK_TOP - 42             // 108
const POSTS       = [210, 250, 295, 340, 385, 430, 470]
const POST_TOP_Y  = [112,  93,  82,  78,  82,  93, 112]
const DOM_STEM    = { x: 334, y: RAIL_TOP - 38, w: 12, h: 30 }  // y=70
const DOM_BALL    = { cx: TANK_CX, cy: 60, r: 14 }

// viewBox 스케일: 원래 좌표(680×580) → 표시(340×290)
const VB = "0 0 680 580"

function BallastDiagram({ progressPct, remainingTon, expectedTon }) {
  const pct        = Math.min(100, Math.max(0, progressPct ?? 0))
  const remainFrac = 1 - pct / 100

  // 채움 높이 (탱크 body 기준)
  const fillH   = BODY_H * remainFrac
  const fillY   = TANK_BOTTOM - fillH           // body 내 채움 시작 y
  // 액면 타원 (clipPath 안에서 그려지므로 바디 위에만 보임)
  const waveRY  = TANK_RY * 0.8
  const waveY   = fillY

  // clipPath: 바디 rect + 하단 캡 타원을 합쳐 탱크 내부만 클리핑
  // SVG clipPath에 여러 도형 가능 → union으로 처리됨
  const textCY  = TANK_TOP + BODY_H / 2        // 탱크 세로 중앙

  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: 'auto', display: 'block', marginTop: 14 }}>
      <defs>
        {/* 탱크 내부 클리핑 */}
        <clipPath id="lngClip">
          <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H} />
          <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy} rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry} />
        </clipPath>

        {/* 연료 그라디언트 */}
        <linearGradient id="lngFuelGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#cc3300" stopOpacity="1"    />
          <stop offset="60%"  stopColor="#ff5900" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ff9944" stopOpacity="0.75" />
        </linearGradient>

        {/* 탱크 바디 하이라이트 */}
        <linearGradient id="lngBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(58,122,176,0.18)" />
          <stop offset="40%"  stopColor="rgba(100,180,220,0.06)" />
          <stop offset="100%" stopColor="rgba(58,122,176,0.22)" />
        </linearGradient>
      </defs>

      {/* ── 탱크 바디 배경 ── */}
      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H}
            fill="#070f18" />

      {/* ── 연료 fill ── */}
      {fillH > 1 && (
        <rect x={BODY_X} y={fillY} width={BODY_W} height={fillH + CAP_BOTTOM.ry}
              fill="url(#lngFuelGrad)" clipPath="url(#lngClip)" />
      )}

      {/* ── 액면 타원 ── */}
      {fillH > 4 && remainFrac < 0.99 && (
        <ellipse cx={TANK_CX} cy={waveY} rx={TANK_RX - 1} ry={waveRY}
                 fill="rgba(255,160,70,0.18)"
                 stroke="rgba(255,160,70,0.7)" strokeWidth="2"
                 clipPath="url(#lngClip)" />
      )}

      {/* ── 하단 캡 (fill 위) ── */}
      <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy}
               rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry}
               fill={fillH >= BODY_H ? "url(#lngFuelGrad)" : "#070f18"}
               stroke="#3a7ab0" strokeWidth="2" />

      {/* ── 탱크 바디 테두리 + 광택 오버레이 ── */}
      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H}
            fill="url(#lngBodyGrad)" stroke="#3a7ab0" strokeWidth="2" />

      {/* ── 상단 캡 ── */}
      <ellipse cx={CAP_TOP.cx} cy={CAP_TOP.cy}
               rx={CAP_TOP.rx} ry={CAP_TOP.ry}
               fill="#0a1520" stroke="#3a7ab0" strokeWidth="2" />

      {/* ── 난간 기둥 ── */}
      {POSTS.map((px, i) => (
        <line key={i}
              x1={px} y1={POST_TOP_Y[i]}
              x2={px} y2={RAIL_BOTTOM}
              stroke="rgba(100,180,220,0.4)" strokeWidth="2.5" />
      ))}

      {/* ── 난간 상단 링 (타원) ── */}
      <ellipse cx={TANK_CX} cy={RAIL_TOP}
               rx={RAIL_RX} ry={RAIL_RY}
               fill="none" stroke="rgba(100,180,220,0.5)" strokeWidth="2.5" />

      {/* ── 난간 하단 링 (탱크 상단 캡과 동일) ── */}
      <ellipse cx={TANK_CX} cy={RAIL_BOTTOM}
               rx={RAIL_RX} ry={RAIL_RY}
               fill="none" stroke="rgba(100,180,220,0.3)" strokeWidth="1.5" />

      {/* ── 돔 기둥 + 볼 ── */}
      <rect x={DOM_STEM.x} y={DOM_STEM.y} width={DOM_STEM.w} height={DOM_STEM.h}
            fill="rgba(100,180,220,0.5)" rx="3" />
      <circle cx={DOM_BALL.cx} cy={DOM_BALL.cy} r={DOM_BALL.r}
              fill="#0a1520" stroke="rgba(100,180,220,0.7)" strokeWidth="2.5" />

      {/* ── 중앙 수치 ── */}
      <text x={TANK_CX} y={textCY - 20} textAnchor="middle" fill="#ff5900"
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

      {/* ── LNG TANK 라벨 ── */}
      <text x={TANK_CX} y={TANK_BOTTOM + 38} textAnchor="middle"
            fill="rgba(100,180,220,0.3)" fontSize="16" fontWeight="700" letterSpacing="4">
        LNG TANK
      </text>
    </svg>
  )
}

// ── Cargo 탱크 (비대칭 팔각형) ────────────────────────────
const CARGO_TANK   = "M 62,14 L 218,14 L 276,58 L 276,148 L 248,180 L 32,180 L 4,148 L 4,58 Z"
const CT_TOP       = 14
const CT_BOTTOM    = 180
const CARGO_TOTAL  = 78_300   // ton

function CargoDiagram() {
  const tankH  = CT_BOTTOM - CT_TOP   // 166

  return (
    <div style={{ marginTop: 10 }}>
      {/* ── 카고 정보 ── */}
      <div className={styles.grid} style={{ marginBottom: 10 }}>
        <Cell label="카고 용량" val={CARGO_TOTAL.toLocaleString()} unit="ton" />
        <Cell label="카고 상태" val="만재" accent />
      </div>

      {/* ── 탱크 다이어그램 ── */}
      <svg viewBox="0 0 280 200" xmlns="http://www.w3.org/2000/svg"
           style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <clipPath id="cargoClip">
            <path d={CARGO_TANK} />
          </clipPath>
          <linearGradient id="cargoGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor="#0d4a7a" stopOpacity="1"    />
            <stop offset="60%"  stopColor="#1a7abf" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#4ab0e8" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="cargoBodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(30,100,180,0.22)" />
            <stop offset="50%"  stopColor="rgba(100,180,240,0.06)" />
            <stop offset="100%" stopColor="rgba(30,100,180,0.22)" />
          </linearGradient>
        </defs>

        {/* 탱크 배경 */}
        <path d={CARGO_TANK} fill="#060d14" stroke="#2a5a80" strokeWidth="1.5" />

        {/* 카고 fill (만재 = 100%) */}
        <rect x="0" y={CT_TOP} width="280" height={tankH + 8}
              fill="url(#cargoGrad)" clipPath="url(#cargoClip)" />

        {/* 광택 오버레이 */}
        <path d={CARGO_TANK} fill="url(#cargoBodyGrad)" clipPath="url(#cargoClip)" />

        {/* 탱크 테두리 */}
        <path d={CARGO_TANK} fill="none" stroke="#3a7ab0" strokeWidth="1.5" />

        {/* 중앙 수치 */}
        <text x="140" y="96" textAnchor="middle" fill="#4ab0e8"
              fontSize="22" fontWeight="700"
              fontFamily="'SF Mono','Fira Code','Consolas',monospace">
          {CARGO_TOTAL.toLocaleString()}
        </text>
        <text x="140" y="112" textAnchor="middle"
              fill="rgba(255,255,255,0.32)" fontSize="9">ton 만재</text>

        {/* 라벨 */}
        <text x="140" y="170" textAnchor="middle"
              fill="rgba(100,180,220,0.3)" fontSize="8" fontWeight="700" letterSpacing="2">
          CARGO TANK
        </text>
      </svg>
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

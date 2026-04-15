import { SHIP } from '../constants/ship'
import styles from './EnginePanel.module.css'

const RE_LIQ_CAPACITY_KG = SHIP.reLiqCapacityT * 1000   // 20,000 kg

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

export default function EnginePanel({ bogData, isRunning }) {
  const accumulated = bogData?.accumulatedKg ?? 0
  const capacity    = bogData?.reLiqCapacityKg ?? RE_LIQ_CAPACITY_KG
  const pct         = capacity > 0 ? Math.min(100, (accumulated / capacity) * 100) : 0
  const isAlert     = pct >= 75
  const hasData     = bogData != null

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          BOG 누적량
          {isRunning && <span className={styles.liveDot} />}
        </div>
        <div className={styles.rateRow}>
          <span className={styles.rateNum}>{SHIP.engineBOGTonPerHour}</span>
          <span className={styles.rateUnit}>ton/hr 엔진 소모</span>
        </div>
        <BOGAccumDiagram
          pct={pct}
          accumulatedT={accumulated / 1000}
          capacityT={capacity / 1000}
          isAlert={isAlert}
          hasData={hasData}
        />
      </section>
    </div>
  )
}

function BOGAccumDiagram({ pct, accumulatedT, capacityT, isAlert, hasData }) {
  const clampedPct = Math.min(100, Math.max(0, pct))
  const fillFrac   = clampedPct / 100
  const fillH      = BODY_H * fillFrac
  const fillY      = TANK_BOTTOM - fillH
  const waveRY     = TANK_RY * 0.8
  const textCY     = TANK_TOP + BODY_H / 2

  // 색상: 75% 미만 → 청색 계열, 75% 이상 → 빨간색
  const fillColor   = isAlert
    ? 'url(#bogAlertGrad)'
    : 'url(#bogNormalGrad)'
  const waveColor   = isAlert
    ? 'rgba(255,80,80,0.18)'
    : 'rgba(80,180,255,0.18)'
  const waveStroke  = isAlert
    ? 'rgba(255,80,80,0.7)'
    : 'rgba(80,180,255,0.7)'
  const bodyStroke  = isAlert ? '#aa2222' : '#3a7ab0'
  const pctColor    = isAlert ? '#ff3333' : '#4ab0e8'

  return (
    <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', height: 'auto', display: 'block', marginTop: 10 }}>
      <defs>
        <clipPath id="bogClip">
          <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H} />
          <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy} rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry} />
        </clipPath>

        {/* 정상 상태 그라디언트 (파란-청록) */}
        <linearGradient id="bogNormalGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#1a4a8a" stopOpacity="1"    />
          <stop offset="60%"  stopColor="#2a7acc" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#55aaff" stopOpacity="0.75" />
        </linearGradient>

        {/* 경고 상태 그라디언트 (빨간) */}
        <linearGradient id="bogAlertGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#8a0000" stopOpacity="1"    />
          <stop offset="60%"  stopColor="#cc2200" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ff5533" stopOpacity="0.75" />
        </linearGradient>

        {/* 탱크 바디 글로스 */}
        <linearGradient id="bogBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(58,122,176,0.18)" />
          <stop offset="40%"  stopColor="rgba(100,180,220,0.06)" />
          <stop offset="100%" stopColor="rgba(58,122,176,0.22)" />
        </linearGradient>
      </defs>

      {/* 탱크 배경 */}
      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H} fill="#070f18" />

      {/* BOG 누적 채우기 (아래에서 위로) */}
      {fillH > 1 && (
        <rect x={BODY_X} y={fillY} width={BODY_W} height={fillH + CAP_BOTTOM.ry}
              fill={fillColor} clipPath="url(#bogClip)" />
      )}

      {/* 액면 파동 */}
      {fillH > 4 && fillFrac < 0.99 && (
        <ellipse cx={TANK_CX} cy={fillY} rx={TANK_RX - 1} ry={waveRY}
                 fill={waveColor}
                 stroke={waveStroke} strokeWidth="2"
                 clipPath="url(#bogClip)" />
      )}

      {/* 75% 경계선 표시 */}
      {(() => {
        const lineY = TANK_BOTTOM - BODY_H * 0.75
        return (
          <>
            <line x1={BODY_X + 4} y1={lineY} x2={BODY_X + BODY_W - 4} y2={lineY}
                  stroke="rgba(255,200,0,0.55)" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={BODY_X + BODY_W + 6} y={lineY + 4}
                  fill="rgba(255,200,0,0.7)" fontSize="14" fontWeight="700">75%</text>
          </>
        )
      })()}

      {/* 하단 캡 */}
      <ellipse cx={CAP_BOTTOM.cx} cy={CAP_BOTTOM.cy}
               rx={CAP_BOTTOM.rx} ry={CAP_BOTTOM.ry}
               fill={fillH >= BODY_H ? fillColor : "#070f18"}
               stroke={bodyStroke} strokeWidth="2" />

      {/* 탱크 바디 */}
      <rect x={BODY_X} y={TANK_TOP} width={BODY_W} height={BODY_H}
            fill="url(#bogBodyGrad)" stroke={bodyStroke} strokeWidth="2" />

      {/* 상단 캡 */}
      <ellipse cx={CAP_TOP.cx} cy={CAP_TOP.cy}
               rx={CAP_TOP.rx} ry={CAP_TOP.ry}
               fill="#0a1520" stroke={bodyStroke} strokeWidth="2" />

      {/* 지지대 */}
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

      {/* 중앙 텍스트 */}
      {hasData ? (
        <>
          <text x={TANK_CX} y={textCY - 24} textAnchor="middle"
                fill={pctColor} fontSize="52" fontWeight="700"
                fontFamily="'SF Mono','Fira Code','Consolas',monospace">
            {clampedPct.toFixed(1)}
          </text>
          <text x={TANK_CX} y={textCY + 12} textAnchor="middle"
                fill="rgba(255,255,255,0.32)" fontSize="20">%</text>
          <text x={TANK_CX} y={textCY + 38} textAnchor="middle"
                fill="rgba(255,255,255,0.22)" fontSize="17">
            {accumulatedT.toFixed(2)} / {capacityT.toFixed(0)} t
          </text>
        </>
      ) : (
        <text x={TANK_CX} y={textCY} textAnchor="middle"
              fill="rgba(255,255,255,0.2)" fontSize="20">
          대기중
        </text>
      )}

      <text x={TANK_CX} y={TANK_BOTTOM + 38} textAnchor="middle"
            fill={isAlert ? 'rgba(255,80,80,0.5)' : 'rgba(100,180,220,0.3)'}
            fontSize="16" fontWeight="700" letterSpacing="4">
        BOG ACCUM
      </text>
    </svg>
  )
}

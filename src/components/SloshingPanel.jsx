import { useState, useEffect, useRef } from 'react'
import styles from './SloshingPanel.module.css'

// ── 카고 탱크 상수 ─────────────────────────────────────────
const CARGO_TANK = "M 62,14 L 218,14 L 276,58 L 276,148 L 248,180 L 32,180 L 4,148 L 4,58 Z"
const CT_TOP     = 14
const CT_BOTTOM  = 180
const CT_CX      = 140     // 탱크 중심 x

const FILL_FRAC = 0.98       // 출항 초기 충전율 98% — Full Condition (low sloshing)

const TANK_H = CT_BOTTOM - CT_TOP          // 166
const FILL_H = TANK_H * FILL_FRAC          // ~162.7
const BASE_Y = CT_BOTTOM - FILL_H          // ~17.3 (정지 시 액면 y)

// ── 충전율 → 슬로싱 위험 계수 ────────────────────────────
// 물리적 근거:
//   > 90% (Full)     : 유체 구속, 슬로싱 억제 → 매우 낮음
//   80~90%           : 부분 억제 → 낮음
//   20~80% (Partial) : 자유 액면 진동 → 최고 위험 구간
//   10~20%           : 액량 부족, 파고 감소 → 낮음
//   < 10% (Nearly empty): 슬로싱 억제 → 매우 낮음
function fillFactor(f) {
  if (f > 0.90) return 0.08           // Full Condition
  if (f > 0.80) return 0.40
  if (f >= 0.20) return 1.00          // 최위험 구간
  if (f >= 0.10) return 0.45
  return 0.15                         // Nearly Empty
}

// ── 슬로싱 계산 ───────────────────────────────────────────
// Q_Sloshing = f(Wave Height, Wind Speed, Filling Limit)
function calcSloshing(weather) {
  const v    = parseFloat(weather?.windSpeed) || 0
  const vg   = parseFloat(weather?.windGust)  || v
  const vMax = Math.max(v, vg)

  // 유의파고 Hs — 간이 Bretschneider
  const Hs = Math.min(0.0248 * vMax ** 2, 12)   // m

  // 횡동요각 근사 (LNG선 고유주기 ~20s)
  const rollDeg = Math.min(Hs * 2.5, 18)         // °

  const intensity = Math.min((rollDeg / 18) * fillFactor(FILL_FRAC), 1)

  let risk, riskColor
  if      (intensity < 0.15) { risk = '안전'; riskColor = '#4caf7d' }
  else if (intensity < 0.40) { risk = '주의'; riskColor = '#ffcc44' }
  else if (intensity < 0.70) { risk = '경고'; riskColor = '#ff9800' }
  else                       { risk = '위험'; riskColor = '#ff3300' }

  return { Hs: +Hs.toFixed(2), rollDeg: +rollDeg.toFixed(1), intensity, risk, riskColor }
}

// ── 컴포넌트 ──────────────────────────────────────────────
export default function SloshingPanel({ weather }) {
  const [phase, setPhase] = useState(0)
  const phaseRef          = useRef(0)
  const rafRef            = useRef(null)

  const s = calcSloshing(weather)

  // 애니메이션 루프 — intensity가 바뀌면 속도 재설정
  useEffect(() => {
    const speed = 0.018 + s.intensity * 0.030

    const tick = () => {
      phaseRef.current += speed
      setPhase(phaseRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [s.intensity])

  // ── 액면 계산 ──────────────────────────────────────────
  const waveAmp    = 1.5 + s.intensity * 20         // 파고 (SVG units)
  const rollRad    = s.rollDeg * Math.PI / 180
  const curRoll    = rollRad * Math.sin(phase * 0.45)  // 주기적 횡동요

  // y(x) = BASE_Y + tilt(x) + wave(x)
  const surfY = (x) =>
    BASE_Y
    + (x - CT_CX) * Math.tan(curRoll)
    + waveAmp * Math.sin(phase + (x - CT_CX) * 0.045)

  // SVG x 샘플 포인트 (4 ~ 276, 4px 간격)
  const xs = Array.from({ length: 69 }, (_, i) => 4 + i * 4)

  // 파면 선
  const waveLine = xs.map((x, i) =>
    `${i === 0 ? 'M' : 'L'} ${x},${surfY(x).toFixed(2)}`
  ).join(' ')

  // 액체 채움 (파면 + 탱크 하단 폐합)
  const waveFill = [
    `M 4,${CT_BOTTOM}`,
    ...xs.map(x => `L ${x},${surfY(x).toFixed(2)}`),
    `L 276,${CT_BOTTOM} Z`
  ].join(' ')

  // SVG 전체 기울기 (선박 롤링 시각 연출)
  const svgTilt = (s.rollDeg * 0.35 * Math.sin(phase * 0.45)).toFixed(2)

  return (
    <div className={styles.panel}>
      <section className={styles.section}>

        {/* ── 헤더 ── */}
        <div className={styles.sectionLabel}>
          슬로싱 분석
          <span className={styles.riskBadge}
                style={{ color: s.riskColor, borderColor: `${s.riskColor}55` }}>
            {s.risk}
          </span>
        </div>

        {/* ── 파라미터 그리드 ── */}
        <div className={styles.grid}>
          <Cell label="유의파고 Hs" val={s.Hs}                           unit="m" />
          <Cell label="횡동요각"    val={s.rollDeg}                      unit="°" />
          <Cell label="충전율"      val={(FILL_FRAC * 100).toFixed(1)}   unit="%" />
          <Cell label="슬로싱 강도" val={(s.intensity * 100).toFixed(0)} unit="%"
                color={s.intensity > 0.15 ? s.riskColor : undefined} />
        </div>

        {/* ── 탱크 SVG ── */}
        <svg
          viewBox="0 0 280 196"
          style={{
            width: '100%',
            marginTop: 12,
            display: 'block',
            transform: `rotate(${svgTilt}deg)`,
            transformOrigin: '50% 55%',
          }}
        >
          <defs>
            <clipPath id="sloshClip">
              <path d={CARGO_TANK} />
            </clipPath>

            {/* 액체 그라디언트 */}
            <linearGradient id="sloshGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2a9de8" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#0a3060" stopOpacity="1"    />
            </linearGradient>

            {/* 파면 상단 발광 */}
            <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#80d4ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2a9de8" stopOpacity="0"    />
            </linearGradient>
          </defs>

          {/* 탱크 배경 */}
          <path d={CARGO_TANK} fill="#060d14" stroke="#2a5a80" strokeWidth="1.5" />

          {/* 액체 채움 */}
          <path d={waveFill} fill="url(#sloshGrad)" clipPath="url(#sloshClip)" />

          {/* 파면 상단 발광 레이어 */}
          {s.intensity > 0.05 && (
            <path
              d={[
                `M 4,${surfY(4).toFixed(2)}`,
                ...xs.slice(1).map(x => `L ${x},${surfY(x).toFixed(2)}`),
                `L 276,${Math.max(...xs.map(surfY)).toFixed(2)}`,
                `L 4,${Math.max(...xs.map(surfY)).toFixed(2)} Z`
              ].join(' ')}
              fill="url(#waveGlow)"
              clipPath="url(#sloshClip)"
            />
          )}

          {/* 파면 선 */}
          <path d={waveLine}
                fill="none"
                stroke="rgba(130,215,255,0.85)"
                strokeWidth="1.8"
                clipPath="url(#sloshClip)" />

          {/* 탱크 테두리 */}
          <path d={CARGO_TANK} fill="none" stroke="#3a7ab0" strokeWidth="1.5" />

          {/* 충전율 텍스트 */}
          <text x="140" y="134" textAnchor="middle"
                fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="700" letterSpacing="2">
            {(FILL_FRAC * 100).toFixed(0)}% FILLED
          </text>
          <text x="140" y="172" textAnchor="middle"
                fill="rgba(100,180,220,0.25)" fontSize="7" fontWeight="700" letterSpacing="3">
            CARGO TANK
          </text>
        </svg>

      </section>
    </div>
  )
}

function Cell({ label, val, unit, color }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellVal}>
        <span className={styles.cellNum} style={color ? { color } : undefined}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
      </span>
    </div>
  )
}

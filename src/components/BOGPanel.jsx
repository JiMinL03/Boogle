import { useState, useEffect, useRef } from 'react'
import styles from './BOGPanel.module.css'

// ── 탱크 물성 상수 ─────────────────────────────────────────
const LNG_VOL   = 174_000       // m³
const RHO_LNG   = 430           // kg/m³
const LHV_BASE  = 509_000       // kJ/kg  (대기압 기화잠열)
const LNG_MASS  = LNG_VOL * RHO_LNG   // 74,820,000 kg

// ── 탱크 압력 (kPa gauge) ──────────────────────────────────
const P_GAUGE_KPA = 5.0

// ── 압력 보정 잠열 (Clausius-Clapeyron 근사) ─────────────
function correctedLHV() {
  const P_abs = 101.325 + P_GAUGE_KPA
  return LHV_BASE * (1 + 0.04 * (P_abs - 101.325) / 101.325)  // kJ/kg
}

// ── BOG 계산 ──────────────────────────────────────────────
// Input: Q_total (kW, from ThermalPanel) + Q_kinetic (kW, from SloshingPanel)
function calcBOG(Q_thermal_kW, Q_kinetic_kW) {
  const Q_total_W  = (Q_thermal_kW + Q_kinetic_kW) * 1_000   // W (kW 단위를 W로 변환)
  const dH_Jkg     = correctedLHV() * 1_000                  // J/kg
  const bogKgPerS  = Q_total_W / dH_Jkg
  const bogKgPerHr = bogKgPerS * 3_600
  const bor        = (bogKgPerS * 86_400 / LNG_MASS) * 100
  return {
    bogKgHr: +bogKgPerHr.toFixed(2),
    bor:     +bor.toFixed(4),
    Q_total: +(Q_thermal_kW + Q_kinetic_kW).toFixed(1),
    dH:      +correctedLHV().toFixed(0),
  }
}

const MAX_HISTORY = 60
const CHART_W = 228
const CHART_H = 60

export default function BOGPanel({ thermalData, sloshingData, onBOGChange }) {
  const [history, setHistory] = useState([])
  const prevThermalRef = useRef(null)

  const Q_thermal_kW  = thermalData?.Q_total ?? 0
  const Ws            = sloshingData?.Ws ?? 1
  const Q_kinetic_kW  = sloshingData
    ? +(sloshingData.intensity * 80 * Ws).toFixed(1)
    : 0
  const current = (Q_thermal_kW > 0 || Q_kinetic_kW > 0)
    ? calcBOG(Q_thermal_kW, Q_kinetic_kW)
    : null

  useEffect(() => {
    if (!current || thermalData === prevThermalRef.current) return
    prevThermalRef.current = thermalData
    setHistory(prev => [...prev, { bog: current.bogKgHr }].slice(-MAX_HISTORY))
  }, [thermalData])

  useEffect(() => {
    onBOGChange?.(current)
  }, [Q_thermal_kW, Q_kinetic_kW])

  const borRisk = current
    ? current.bor < 0.10 ? '#4caf7d'
    : current.bor < 0.15 ? '#ffcc44'
    : '#ff5900'
    : '#ffffff'

  // ── 스파크라인 ──────────────────────────────────────────
  let sparkPath = '', sparkFill = '', minB = 0, maxB = 0
  if (history.length >= 2) {
    const bogs = history.map(h => h.bog)
    minB = Math.min(...bogs)
    maxB = Math.max(...bogs)
    const rangeB = Math.max(maxB - minB, 0.5)
    const pts = history.map((h, i) => ({
      x: (i / (history.length - 1)) * CHART_W,
      y: CHART_H - ((h.bog - minB) / rangeB) * (CHART_H - 8) - 4,
    }))
    sparkPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    sparkFill = [
      `M ${pts[0].x.toFixed(1)},${CHART_H}`,
      ...pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      `L ${pts[pts.length - 1].x.toFixed(1)},${CHART_H} Z`,
    ].join(' ')
  }

  if (!current) {
    return (
      <div className={styles.panel}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>증발 가스 (BOG / BOR)</div>
          <div className={styles.emptyBody}>
            <div className={styles.empty}>기상 데이터 수집 후 계산됩니다</div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <section className={styles.section}>

        {/* ── 헤더 ── */}
        <div className={styles.sectionLabel}>증발 가스 (BOG / BOR)</div>

        {/* ── 핵심 수치 ── */}
        <div className={styles.heroRow}>
          <div className={styles.heroBlock}>
            <span className={styles.heroLabel}>BOG</span>
            <div className={styles.heroVal}>
              <span className={styles.heroNum}>
                {current.bogKgHr.toFixed(1)}
              </span>
              <span className={styles.heroUnit}>kg/hr</span>
            </div>
          </div>
          <div className={styles.heroDivider} />
          <div className={styles.heroBlock}>
            <span className={styles.heroLabel}>BOR</span>
            <div className={styles.heroVal}>
              <span className={styles.heroNum} style={{ color: borRisk }}>
                {current.bor.toFixed(4)}
              </span>
              <span className={styles.heroUnit}>%/day</span>
            </div>
          </div>
        </div>

        {/* ── 차트 ── */}
        <div className={styles.chartWrap}>
          <div className={styles.chartLabel}>BOG (kg/hr) 수집 이력</div>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chart}>
            <defs>
              <linearGradient id="bogFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ff5900" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff5900" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(r => (
              <line key={r} x1="0" y1={CHART_H * r} x2={CHART_W} y2={CHART_H * r}
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            {history.length >= 2 ? (
              <>
                <path d={sparkFill} fill="url(#bogFillGrad)" />
                <path d={sparkPath} fill="none" stroke="#ff5900" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                {(() => {
                  const bogs   = history.map(h => h.bog)
                  const minB2  = Math.min(...bogs)
                  const rangeB = Math.max(Math.max(...bogs) - minB2, 0.5)
                  const last   = history[history.length - 1]
                  const cy     = CHART_H - ((last.bog - minB2) / rangeB) * (CHART_H - 8) - 4
                  return <circle cx={CHART_W} cy={cy} r="3" fill="#ff5900" />
                })()}
                <text x="2" y="9"          fill="rgba(255,255,255,0.4)" fontSize="7">{maxB.toFixed(1)}</text>
                <text x="2" y={CHART_H - 2} fill="rgba(255,255,255,0.4)" fontSize="7">{minB.toFixed(1)}</text>
              </>
            ) : (
              <text x={CHART_W / 2} y={CHART_H / 2} textAnchor="middle"
                    fill="rgba(255,255,255,0.3)" fontSize="9">수집 중…</text>
            )}
          </svg>
        </div>

        {/* ── 입력 파라미터 ── */}
        <div className={styles.divider} />
        <div className={styles.blockLabel}>입력 파라미터</div>
        <div className={styles.grid}>
          <Cell label="열 유입량"       val={Q_thermal_kW.toFixed(1)} unit="kW" />
          <Cell label="슬로싱 열량"     val={Q_kinetic_kW.toFixed(1)} unit="kW" accent />
          <Cell label="총 열 유입"      val={current.Q_total}          unit="kW" />
          <Cell label="기화 잠열"       val={current.dH}               unit="kJ/kg" />
          <Cell label="탱크 압력"       val={`+${P_GAUGE_KPA}`}        unit="kPa" />
          {sloshingData?.Hs != null && (
            <Cell label="보정 파고"     val={sloshingData.Hs}          unit="m"
                  note={sloshingData.regime ?? null} />
          )}
          {sloshingData?.alphaDeg != null && (
            <Cell label="파향-선수 교차각" val={sloshingData.alphaDeg} unit="°" />
          )}
        </div>

      </section>
    </div>
  )
}

function Cell({ label, val, unit, accent, note }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellVal}>
        <span className={`${styles.cellNum} ${accent ? styles.accent : ''}`}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
        {note && <span className={styles.cellNote}>{note}</span>}
      </span>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import styles from './BOGChartPanel.module.css'

const LHV_BASE    = 509_000
const P_GAUGE_KPA = 5.0

function correctedLHV() {
  const P_abs = 101.325 + P_GAUGE_KPA
  return LHV_BASE * (1 + 0.04 * (P_abs - 101.325) / 101.325)
}

function calcBogKgHr(Q_thermal_kW, Q_kinetic_kW) {
  const Q_total_W  = (Q_thermal_kW + Q_kinetic_kW) * 1_000
  const dH_Jkg     = correctedLHV() * 1_000
  return (Q_total_W / dH_Jkg) * 3_600
}

const MAX_HISTORY = 60

export default function BOGChartPanel({ thermalData, sloshingData }) {
  const [history, setHistory] = useState([])
  const prevThermalRef = useRef(null)

  useEffect(() => {
    if (!thermalData || thermalData === prevThermalRef.current) return
    prevThermalRef.current = thermalData

    const Q_thermal_kW = thermalData.Q_total ?? 0
    const Q_kinetic_kW = sloshingData ? +(sloshingData.intensity * 80).toFixed(1) : 0
    const bog = calcBogKgHr(Q_thermal_kW, Q_kinetic_kW)

    setHistory(prev => [...prev, { t: Date.now(), bog: +bog.toFixed(2) }].slice(-MAX_HISTORY))
  }, [thermalData])

  const CHART_W = 200
  const CHART_H = 100

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

  const latest = history[history.length - 1]

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <div className={styles.sectionLabel}>BOG 이력</div>

        {/* ── 현재값 ── */}
        <div className={styles.currentRow}>
          <span className={styles.currentNum}>
            {latest ? latest.bog.toFixed(1) : '--'}
          </span>
          <span className={styles.currentUnit}>kg/hr</span>
        </div>

        {/* ── 차트 ── */}
        <div className={styles.chartWrap}>
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className={styles.chart}>
            <defs>
              <linearGradient id="chartFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ff5900" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ff5900" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* 그리드 */}
            {[0.25, 0.5, 0.75].map(r => (
              <line key={r}
                x1="0" y1={CHART_H * r} x2={CHART_W} y2={CHART_H * r}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}

            {history.length >= 2 ? (
              <>
                <path d={sparkFill} fill="url(#chartFillGrad)" />
                <path d={sparkPath} fill="none"
                      stroke="#ff5900" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                {/* 최신 점 */}
                {(() => {
                  const bogs   = history.map(h => h.bog)
                  const minB2  = Math.min(...bogs)
                  const rangeB = Math.max(Math.max(...bogs) - minB2, 0.5)
                  const last   = history[history.length - 1]
                  const cy     = CHART_H - ((last.bog - minB2) / rangeB) * (CHART_H - 8) - 4
                  return (
                    <>
                      <circle cx={CHART_W} cy={cy} r="4" fill="#ff5900"
                              style={{ filter: 'drop-shadow(0 0 4px #ff5900)' }} />
                    </>
                  )
                })()}
              </>
            ) : (
              <text x={CHART_W / 2} y={CHART_H / 2} textAnchor="middle"
                    fill="rgba(255,255,255,0.3)" fontSize="9">
                수집 중…
              </text>
            )}

            {/* Y축 min/max 레이블 */}
            {history.length >= 2 && (
              <>
                <text x="2" y="10" fill="rgba(255,255,255,0.35)" fontSize="7">
                  {maxB.toFixed(1)}
                </text>
                <text x="2" y={CHART_H - 2} fill="rgba(255,255,255,0.35)" fontSize="7">
                  {minB.toFixed(1)}
                </text>
              </>
            )}
          </svg>
        </div>

        {/* ── 수집 포인트 수 ── */}
        <div className={styles.countLabel}>
          {history.length} / {MAX_HISTORY} 포인트
        </div>

      </section>
    </div>
  )
}

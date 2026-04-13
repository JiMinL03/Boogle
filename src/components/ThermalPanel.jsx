import { useEffect } from 'react'
import styles from './ThermalPanel.module.css'

// ── LNG 탱크 물성 상수 ─────────────────────────────────────
const LNG_TEMP  = -162        // °C (LNG 저장온도, 대기압 비점)

// ── 탱크 표면적 (막식 탱크 4기 기준) ─────────────────────
const A_TOP    = 7_500        // m²  상부 (대기 노출)
const A_SIDE   = 9_500        // m²  측면 (대기 노출)
const A_BOTTOM = 7_000        // m²  하부 (해수 접촉)

// ── 열관류율 U (W/m²·K) ───────────────────────────────────
const U_TOP    = 0.12
const U_SIDE   = 0.10
const U_BOTTOM = 0.14


function fmt1(v)   { return v.toFixed(1) }
function fmtKw(w)  { return (w / 1000).toFixed(1) }

function calcThermal(weather) {
  const T_air = parseFloat(weather.temp)
  const T_sea = parseFloat(weather.seaTemp)

  const validAir = !isNaN(T_air)
  const validSea = !isNaN(T_sea)

  const dT_air = validAir ? T_air - LNG_TEMP : 0    // ≈ 187 K (전형값)
  const dT_sea = validSea ? T_sea - LNG_TEMP : 0    // ≈ 182 K

  // 열유입 (W)
  const Q_top    = U_TOP    * A_TOP    * dT_air
  const Q_side   = U_SIDE   * A_SIDE   * dT_air
  const Q_bottom = U_BOTTOM * A_BOTTOM * dT_sea

  const Q_total = Q_top + Q_side + Q_bottom   // W

  return {
    dT_air: validAir ? dT_air : null,
    dT_sea: validSea ? dT_sea : null,
    Q_top, Q_side, Q_bottom, Q_total,
  }
}

export default function ThermalPanel({ weather, onThermalChange }) {
  const r = weather ? calcThermal(weather) : null

  useEffect(() => {
    if (r) onThermalChange?.(r)
  }, [weather])

  if (!r) {
    return (
      <div className={styles.panel}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>열유입 분석</div>
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
        <div className={styles.sectionLabel}>
          열유입 분석
        </div>

        {/* ── Q_Total ── */}
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Q</span>
          <span className={styles.totalLabel + ' ' + styles.sub}>Total</span>
          <span className={styles.totalVal}>{fmtKw(r.Q_total)}</span>
          <span className={styles.totalUnit}>kW</span>
        </div>

        <div className={styles.divider} />

        {/* ── 열유입 분해 ── */}
        <div className={styles.blockLabel}>열유입 분해</div>
        <div className={styles.grid3}>
          <Cell label="Q 상부"  val={fmtKw(r.Q_top)}    unit="kW" />
          <Cell label="Q 측면"  val={fmtKw(r.Q_side)}   unit="kW" />
          <Cell label="Q 하부"  val={fmtKw(r.Q_bottom)} unit="kW" accent />
        </div>

        <div className={styles.divider} />

        {/* ── ΔT 파라미터 ── */}
        <div className={styles.blockLabel}>온도 파라미터</div>
        <div className={styles.grid3}>
          <Cell label="ΔT 기온"   val={r.dT_air != null ? fmt1(r.dT_air) : '--'} unit="K" />
          <Cell label="ΔT 해수"   val={r.dT_sea != null ? fmt1(r.dT_sea) : '--'} unit="K" />
          <Cell label="LNG 온도"  val={LNG_TEMP} unit="°C" />
        </div>


      </section>
    </div>
  )
}

function Cell({ label, val, unit, accent, solar, highlight }) {
  const numClass = [
    styles.cellNum,
    accent    ? styles.accent    : '',
    solar     ? styles.solar     : '',
    highlight ? styles.highlight : '',
  ].join(' ')

  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellVal}>
        <span className={numClass}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
      </span>
    </div>
  )
}

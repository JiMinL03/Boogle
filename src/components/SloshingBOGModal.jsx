import { createPortal } from 'react-dom'
import styles from './SloshingBOGModal.module.css'

const WS_CAP = 10

export default function SloshingBOGModal({ open, onClose, sloshingData, Q_thermal_kW, Q_kinetic_kW }) {
  if (!open || !sloshingData) return null

  const s  = sloshingData
  const Ws = s.Ws ?? 1

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <span className={styles.title}>슬로싱 → BOG 계산 파라미터</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {/* ── STEP 1: 슬로싱 강도 ── */}
        <div className={styles.step}>
          <div className={styles.stepLabel}>STEP 1 · 슬로싱 강도 계산</div>
          <div className={styles.formula}>
            intensity = (rollDeg / 18°) × fillFactor
          </div>
          <div className={styles.grid}>
            <Row label="보정 파고 (Hs)"    val={s.Hs}                                      unit="m"  />
            <Row label="횡동요각"          val={s.rollDeg}                                  unit="°"  />
            <Row label="충진율"            val={s.fillFrac != null ? (s.fillFrac * 100).toFixed(1) : '--'} unit="%" />
            <Row label="충진 계수"         val={s.fillFactor?.toFixed(3) ?? '--'}            unit=""
                 note={fillFactorNote(s.fillFrac)} />
            <Row label="슬로싱 강도"       val={s.intensity?.toFixed(4) ?? '--'}             unit=""
                 highlight color={s.riskColor} />
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── STEP 2: 공진 증폭 ── */}
        <div className={styles.step}>
          <div className={styles.stepLabel}>STEP 2 · 공진 증폭 계수 (W_s)</div>
          <div className={styles.formula}>
            W_s = DAF × |sin χ| &nbsp;·&nbsp; DAF = 1 / √((1−r²)² + (2ζr)²)
          </div>
          <div className={styles.grid}>
            <Row label="탱크 고유주파수 (ωtank)" val={s.omegaTank?.toFixed(4) ?? '--'} unit="rad/s" />
            <Row label="만남 주파수 (ωe)"        val={s.omegaE?.toFixed(4)    ?? '--'} unit="rad/s" />
            <Row label="주파수비 (r = ωe/ωtank)" val={s.r?.toFixed(4)         ?? '--'} unit=""
                 note={s.r != null ? (s.r > 0.8 && s.r < 1.2 ? '⚠ 공진 임박' : s.r > 0.6 ? '주의' : '안전') : null}
                 color={s.r != null ? (s.r > 0.8 && s.r < 1.2 ? '#ff3300' : s.r > 0.6 ? '#ffcc44' : '#4caf7d') : undefined} />
            <Row label="DAF (동적 증폭 계수)"    val={s.daf?.toFixed(4)       ?? '--'} unit="" />
            <Row label="횡파 방향성 |sin χ|"     val={s.sinChi?.toFixed(4)    ?? '--'} unit="" />
            <Row label="W_s (공진 증폭 × 방향)"  val={s.Ws > WS_CAP ? `>${WS_CAP}` : s.Ws?.toFixed(4) ?? '--'} unit=""
                 highlight color={Ws > 3 ? '#ff3300' : Ws > 1.5 ? '#ff9800' : '#4caf7d'} />
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── STEP 3: BOG 열량 ── */}
        <div className={styles.step}>
          <div className={styles.stepLabel}>STEP 3 · 슬로싱 열량 (Q_kinetic)</div>
          <div className={styles.formula}>
            Q_kinetic = intensity × 80 kW × W_s
          </div>
          <div className={styles.calcRow}>
            <span className={styles.calcPart}>{s.intensity?.toFixed(4) ?? '--'}</span>
            <span className={styles.calcOp}>×</span>
            <span className={styles.calcPart}>80</span>
            <span className={styles.calcOp}>×</span>
            <span className={styles.calcPart}>{s.Ws > WS_CAP ? `>${WS_CAP}` : Ws.toFixed(4)}</span>
            <span className={styles.calcOp}>=</span>
            <span className={styles.calcResult}>{Q_kinetic_kW.toFixed(2)}</span>
            <span className={styles.calcUnit}>kW</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── 최종 BOG 입력 합산 ── */}
        <div className={styles.step}>
          <div className={styles.stepLabel}>최종 BOG 입력 열량</div>
          <div className={styles.calcRow}>
            <span className={styles.calcLabel}>열 유입량</span>
            <span className={styles.calcPart}>{Q_thermal_kW.toFixed(1)}</span>
            <span className={styles.calcOp}>+</span>
            <span className={styles.calcLabel}>슬로싱 열량</span>
            <span className={styles.calcPart}>{Q_kinetic_kW.toFixed(1)}</span>
            <span className={styles.calcOp}>=</span>
            <span className={styles.calcResult}>{(Q_thermal_kW + Q_kinetic_kW).toFixed(1)}</span>
            <span className={styles.calcUnit}>kW</span>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

function fillFactorNote(f) {
  if (f == null) return null
  if (f > 0.90) return 'Full (슬로싱 억제)'
  if (f > 0.80) return '부분 억제'
  if (f >= 0.20) return '⚠ 최위험 구간'
  if (f >= 0.10) return '액량 부족, 감소'
  return 'Nearly Empty (억제)'
}

function Row({ label, val, unit, note, highlight, color }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowVal}>
        <span className={styles.rowNum}
              style={highlight && color ? { color } : highlight ? { color: '#ffffff' } : undefined}>
          {val}
        </span>
        {unit && <span className={styles.rowUnit}>{unit}</span>}
        {note && <span className={styles.rowNote}
                       style={color ? { color } : undefined}>{note}</span>}
      </span>
    </div>
  )
}

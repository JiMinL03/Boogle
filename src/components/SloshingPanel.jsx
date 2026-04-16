import { useState, useEffect, useRef, useMemo } from 'react'
import styles from './SloshingPanel.module.css'
import { SHIP } from '../constants/ship'
import WaveInfoModal from './WaveInfoModal'

// ── 카고 탱크 상수 ─────────────────────────────────────────
const CARGO_TANK = "M 62,14 L 218,14 L 276,58 L 276,148 L 248,180 L 32,180 L 4,148 L 4,58 Z"
const CT_TOP     = 14
const CT_BOTTOM  = 180
const CT_CX      = 140     // 탱크 중심 x

const TANK_H = CT_BOTTOM - CT_TOP   // 166

// ── LNG 질량 상수 (BOG 충진율 계산용) ─────────────────────
const LNG_VOL_M3       = 174_000           // m³
const RHO_LNG          = 430              // kg/m³
const LNG_MASS_T       = LNG_VOL_M3 * RHO_LNG / 1000         // 74,820 tonnes (탱크 100% 기준)
const TOTAL_CAPACITY_T = LNG_MASS_T / 0.98                   // 선박 실제 용량 ~76,347 tonnes

// ── 출항지에 따른 초기 충진율 ─────────────────────────────
// 한국은 LNG 수입국: 한국 출항 시 탱크 거의 비어있음(~3%), 외국 출항 시 가득 참(~98%)
const FILL_FRAC_KOREA   = 0.03   // 한국 출항 (수입 항차 시작)
const FILL_FRAC_FOREIGN = 0.98   // 외국 출항 (LNG 선적 후 귀항)

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

// ── 2단계: 조류 방향 가중치 파고 보정 ────────────────────
// H_actual = H_base · (1 + C_wc · cos α_wc)
// C_wc = -0.25 : 역조(α≈180°)→ 증폭, 순조(α≈0°)→ 감소
const C_WC = -0.25

function correctWaveHeight(H_base, waveDeg, currentDeg) {
  if (waveDeg == null || currentDeg == null) return { H_actual: H_base, alphaDeg: null, regime: null }
  // 만남각 [0°, 180°]
  let diff = Math.abs(waveDeg - currentDeg) % 360
  if (diff > 180) diff = 360 - diff
  const alphaRad  = diff * Math.PI / 180
  const H_actual  = Math.max(0, H_base * (1 + C_WC * Math.cos(alphaRad)))
  const regime    = diff > 135 ? '역조' : diff < 45 ? '순조' : '사교'
  return { H_actual: +H_actual.toFixed(2), alphaDeg: +diff.toFixed(1), regime }
}

// ── 3단계: ISSC 파도 에너지 스펙트럼 ─────────────────────
// S_ζ(ω) = 0.11 · H² · ω₁⁻¹ · (ω/ω₁)⁻⁵ · exp[-0.44 · (ω/ω₁)⁻⁴]
// ω₁: 모달 주파수 (ITTC 근사 T₁ = 3.86·√H → ω₁ = 2π/T₁)
const ISSC_N = 80  // 주파수 샘플 수

function calcISSC(H_actual) {
  if (H_actual <= 0) return null
  const T1     = 3.86 * Math.sqrt(H_actual)      // 평균 주기 (s)
  const omega1 = (2 * Math.PI) / T1              // 모달 주파수 (rad/s)

  // ω 범위: 0.15 ~ 3.5 rad/s (로그 스케일로 분포)
  const omegaMin = 0.15
  const omegaMax = 3.5
  const points = []
  for (let i = 0; i < ISSC_N; i++) {
    const t = i / (ISSC_N - 1)
    const w = omegaMin + t * (omegaMax - omegaMin)
    const r = w / omega1
    const S = 0.11 * H_actual ** 2 * (1 / omega1) * r ** -5 * Math.exp(-0.44 * r ** -4)
    points.push({ omega: w, S: isFinite(S) ? S : 0 })
  }
  const Smax = Math.max(...points.map(p => p.S))
  // 피크 위치 인덱스
  const peakIdx = points.reduce((mi, p, i) => p.S > points[mi].S ? i : mi, 0)

  return { T1: +T1.toFixed(2), omega1: +omega1.toFixed(3), Smax: +Smax.toFixed(3), points, peakIdx }
}

// ── 슬로싱 계산 ───────────────────────────────────────────
// Q_Sloshing = f(Wave Height, Wind Speed, Filling Limit)
function calcSloshing(weather, fillFrac) {
  const v    = parseFloat(weather?.windSpeed) || 0
  const vg   = parseFloat(weather?.windGust)  || v
  const vMax = Math.max(v, vg)

  // 1단계: 유의파고 Hs_base — 간이 Bretschneider
  const Hs_base = Math.min(0.0248 * vMax ** 2, 12)   // m

  // 2단계: 조류 방향 가중치 보정
  const { H_actual, alphaDeg, regime } = correctWaveHeight(
    Hs_base, weather?.waveDeg, weather?.currentDeg
  )
  const Hs = H_actual   // 보정된 유효 파고 사용

  // 횡동요각 근사 (LNG선 고유주기 ~20s)
  const rollDeg = Math.min(Hs * 2.5, 18)         // °

  const intensity = Math.min((rollDeg / 18) * fillFactor(fillFrac), 1)

  let risk, riskColor
  if      (intensity < 0.15) { risk = '안전'; riskColor = '#4caf7d' }
  else if (intensity < 0.40) { risk = '주의'; riskColor = '#ffcc44' }
  else if (intensity < 0.70) { risk = '경고'; riskColor = '#ff9800' }
  else                       { risk = '위험'; riskColor = '#ff3300' }

  return { Hs_base: +Hs_base.toFixed(2), Hs: +Hs.toFixed(2), alphaDeg, regime, rollDeg: +rollDeg.toFixed(1), intensity, risk, riskColor }
}

// ── 4단계: 만남 주파수 변환 ──────────────────────────────
// ω_e = ω · (1 - V·ω·cos χ / g)
// χ: 파도-선박 만남각 (0°=선미파, 180°=선수파)
// V: 선속 (m/s), g: 중력가속도
const G = 9.81

function calcEncounterAngle(waveDeg, shipHeading) {
  if (waveDeg == null || shipHeading == null) return null
  // χ = 0° → 선미파(동일 방향), χ = 180° → 선수파(정반대)
  return ((waveDeg - shipHeading) % 360 + 360) % 360
}

function calcEncounterSpectrum(isscPoints, V_knots, chiDeg) {
  if (!isscPoints || chiDeg == null) return null
  const V      = V_knots * 1852 / 3600   // m/s
  const chiRad = chiDeg * Math.PI / 180

  const enc = isscPoints
    .map(({ omega, S }) => {
      const omega_e = omega * (1 - (V * omega * Math.cos(chiRad)) / G)
      return { omega_e, S, omega }
    })
    .filter(p => p.omega_e > 0)          // ω_e ≤ 0 구간 제외

  if (enc.length < 2) return null

  const Smax_e   = Math.max(...enc.map(p => p.S))
  const peakE    = enc.reduce((m, p) => p.S > m.S ? p : m, enc[0])
  const omegaE_peak = +peakE.omega_e.toFixed(3)

  // 체감 주기 분류
  const chi180 = chiDeg > 180 ? 360 - chiDeg : chiDeg   // [0°,180°]로 접기
  const regime =
    chi180 > 135 ? '선수파' :
    chi180 < 45  ? '선미파' : '횡파'

  return { enc, Smax_e, omegaE_peak, regime, chiDeg: +chiDeg.toFixed(1) }
}

// ── 5단계: 슬로싱 가중치 W_s ────────────────────────────
// W_s = DAF × |sin χ|
// DAF = 1 / √([1-(ωe/ωtank)²]² + [2ζ(ωe/ωtank)]²)
const TANK_B      = 43     // m — 횡방향 폭 (transverse sloshing)
const TANK_H_FULL = 26     // m — 만재 시 탱크 높이
const ZETA        = 0.07   // 감쇠비 (LNG membrane tank 기준)
const WS_CAP      = 10     // BOG 계산용 W_s 상한

function calcOmegaTank(fillFrac) {
  const h = fillFrac * TANK_H_FULL
  if (h < 0.05) return null
  // 1차 횡방향 슬로싱 모드 (Faltinsen 공식)
  return Math.sqrt(G * (Math.PI / TANK_B) * Math.tanh(Math.PI * h / TANK_B))
}

function calcSloshingWeight(omegaE, omegaTank, chiDeg) {
  if (omegaE == null || omegaTank == null || chiDeg == null) return null
  const r      = omegaE / omegaTank
  const daf    = 1 / Math.sqrt((1 - r ** 2) ** 2 + (2 * ZETA * r) ** 2)
  const sinChi = Math.abs(Math.sin(chiDeg * Math.PI / 180))
  const Ws     = daf * sinChi
  // 공진 근접 여부
  const nearResonance = r > 0.8 && r < 1.2
  return {
    Ws:     +Ws.toFixed(3),
    WsCapped: +Math.min(Ws, WS_CAP).toFixed(3),
    daf:    +daf.toFixed(3),
    r:      +r.toFixed(3),
    sinChi: +sinChi.toFixed(3),
    omegaTank: +omegaTank.toFixed(3),
    nearResonance,
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────
export default function SloshingPanel({ weather, onSloshingChange, bogData, elapsedMs, shipHeading, reversed }) {
  // reversed=false: 한국 출항(빈 탱크 3%), reversed=true: 외국 출항(가득 찬 98%)
  const initialMassT = reversed
    ? TOTAL_CAPACITY_T * FILL_FRAC_FOREIGN
    : TOTAL_CAPACITY_T * FILL_FRAC_KOREA

  const [phase, setPhase]               = useState(0)
  const [currentMassT, setCurrentMassT] = useState(initialMassT)
  const [modalOpen, setModalOpen]       = useState(false)
  const phaseRef                        = useRef(0)
  const rafRef                          = useRef(null)
  const prevElapsedRef                  = useRef(0)

  // BOG 기반 질량 감소 → 충진율 재계산 (시뮬레이션 경과 시간 기준)
  // 계산식: (현재LNG질량 - ((BOG/1000) * 경과시간)) / (현재LNG질량 / 현재충진율) * 100
  useEffect(() => {
    if (!bogData?.bogKgHr || elapsedMs == null) return
    const deltaMs = elapsedMs - prevElapsedRef.current
    if (deltaMs === 0) return
    prevElapsedRef.current = elapsedMs
    const deltaHours = deltaMs / 3_600_000
    setCurrentMassT(prev =>
      Math.min(LNG_MASS_T, Math.max(prev - (bogData.bogKgHr / 1000) * deltaHours, 0))
    )
  }, [elapsedMs])

  const currentFillFrac = currentMassT / TOTAL_CAPACITY_T

  const initialVolM3  = Math.round(initialMassT * 1000 / RHO_LNG)
  const currentVolM3  = Math.round(currentMassT * 1000 / RHO_LNG)
  const consumedVolM3 = Math.max(0, initialVolM3 - currentVolM3)

  // ── 무거운 계산: weather/fillFrac이 바뀔 때만 재계산 (RAF phase 변경 시 스킵) ──
  const s = useMemo(
    () => calcSloshing(weather, currentFillFrac),
    [weather, currentFillFrac]
  )
  const issc = useMemo(() => calcISSC(s.Hs), [s.Hs])

  const chiDeg    = useMemo(
    () => calcEncounterAngle(weather?.waveDeg, shipHeading),
    [weather?.waveDeg, shipHeading]
  )
  const enc       = useMemo(
    () => calcEncounterSpectrum(issc?.points ?? null, SHIP.knots, chiDeg),
    [issc, chiDeg]
  )
  const omegaTank = useMemo(() => calcOmegaTank(currentFillFrac), [currentFillFrac])
  const wsData    = useMemo(
    () => calcSloshingWeight(enc?.omegaE_peak ?? null, omegaTank, chiDeg),
    [enc?.omegaE_peak, omegaTank, chiDeg]
  )

  useEffect(() => {
    onSloshingChange?.({
      ...s,
      Ws:        wsData?.WsCapped ?? 1,
      daf:       wsData?.daf       ?? null,
      r:         wsData?.r         ?? null,
      sinChi:    wsData?.sinChi    ?? null,
      omegaTank: omegaTank         ?? null,
      omegaE:    enc?.omegaE_peak  ?? null,
      fillFrac:  currentFillFrac,
      fillFactor: fillFactor(currentFillFrac),
    })
  }, [weather, currentFillFrac, wsData?.Ws])

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

  // ── ISSC 차트 SVG 데이터: issc/enc가 바뀔 때만 재계산 (RAF phase 변경 시 스킵) ──
  const spectrumPaths = useMemo(() => {
    if (!issc) return null
    const CW = 228, CH = 72
    const omegaMin = 0.15, omegaMax = 3.5
    const omegaToX = w => ((w - omegaMin) / (omegaMax - omegaMin)) * CW

    const pts = issc.points.map((p, i) => ({
      x: (i / (ISSC_N - 1)) * CW,
      y: issc.Smax > 0 ? CH - (p.S / issc.Smax) * (CH - 8) - 4 : CH - 4,
    }))
    const linePath = pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
    ).join(' ')
    const fillPath = [
      `M ${pts[0].x.toFixed(1)},${CH}`,
      ...pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      `L ${pts[pts.length - 1].x.toFixed(1)},${CH} Z`,
    ].join(' ')
    const pk = pts[issc.peakIdx]

    let encLine = null, encFill = null, encPkX = null, encPkY = null
    if (enc) {
      const ePts = enc.enc
        .map(p => ({
          x: omegaToX(p.omega_e),
          y: issc.Smax > 0 ? CH - (p.S / issc.Smax) * (CH - 8) - 4 : CH - 4,
        }))
        .filter(p => p.x >= 0 && p.x <= CW)
      if (ePts.length >= 2) {
        encLine = ePts.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
        ).join(' ')
        encFill = [
          `M ${ePts[0].x.toFixed(1)},${CH}`,
          ...ePts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
          `L ${ePts[ePts.length - 1].x.toFixed(1)},${CH} Z`,
        ].join(' ')
        const epk = ePts.reduce((m, p) => p.y < m.y ? p : m, ePts[0])
        encPkX = epk.x.toFixed(1)
        encPkY = epk.y.toFixed(1)
      }
    }

    const T1_s = issc.T1
    const Te_s = enc ? +(2 * Math.PI / enc.omegaE_peak).toFixed(2) : null

    return { CW, CH, omegaToX, linePath, fillPath, pk, encLine, encFill, encPkX, encPkY, T1_s, Te_s }
  }, [issc, enc])

  if (!weather) {
    return (
      <div className={styles.panel}>
        <section className={styles.section}>
          <div className={styles.sectionLabel}>슬로싱 분석</div>
          <div className={styles.emptyBody}>
            <div className={styles.empty}>기상 데이터 수집 후 계산됩니다</div>
          </div>
        </section>
      </div>
    )
  }

  // ── 액면 계산 ──────────────────────────────────────────
  const fillH   = TANK_H * currentFillFrac          // 동적 충진 높이
  const baseY   = CT_BOTTOM - fillH                 // 동적 액면 기준 y

  const waveAmp = 1.5 + s.intensity * 20            // 파고 (SVG units)
  const rollRad = s.rollDeg * Math.PI / 180
  const curRoll = rollRad * Math.sin(phase * 0.45)  // 주기적 횡동요

  // y(x) = baseY + tilt(x) + wave(x)
  const surfY = (x) =>
    baseY
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
          <Cell label="기본 파고"       val={s.Hs_base}                          unit="m" />
          <Cell label="보정 파고"       val={s.Hs}                               unit="m"
                color={s.alphaDeg != null ? (s.regime === '역조' ? '#ff9800' : s.regime === '순조' ? '#4caf7d' : undefined) : undefined} />
          {s.alphaDeg != null && (
            <Cell label="파향-조류 교차각" val={s.alphaDeg}                      unit="°"
                  sub={s.regime} />
          )}
          <Cell label="선박 기울기"     val={s.rollDeg}                          unit="°" />
          <Cell label="충진율"          val={(currentFillFrac * 100).toFixed(1)} unit="%" />
          {omegaTank != null && (
            <Cell label="탱크 공진 주파수" val={omegaTank.toFixed(3)}            unit="rad/s" />
          )}
          {wsData != null && (
            <Cell label="공진 근접도"   val={wsData.r}                           unit="배"
                  sub={wsData.nearResonance ? '⚠ 공진 임박' : wsData.r > 0.6 ? '주의' : '안전'}
                  color={wsData.nearResonance ? '#ff3300' : wsData.r > 0.6 ? '#ffcc44' : undefined} />
          )}
          {wsData != null && (
            <Cell label="슬로싱 위험도"
                  val={wsData.Ws > WS_CAP ? `>${WS_CAP}` : wsData.Ws}
                  unit=""
                  color={wsData.Ws > 3 ? '#ff3300' : wsData.Ws > 1.5 ? '#ff9800' : '#4caf7d'}
                  sub={`증폭 ${wsData.daf} × 방향 ${wsData.sinChi}`}
                  wide />
          )}
        </div>

        {/* ── ISSC 파도 에너지 스펙트럼 + 만남 주파수 차트 ── */}
        {spectrumPaths && (() => {
          const { CW, CH, omegaToX, linePath, fillPath, pk, encLine, encFill, encPkX, encPkY, T1_s, Te_s } = spectrumPaths
          const ticks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
          return (
            <div className={styles.spectrumWrap}
                 onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
                 title="클릭하면 파도 방향별 영향을 자세히 볼 수 있습니다"
                 style={{ cursor: 'pointer' }}>

              {/* ── 제목 + 핵심 수치 ── */}
              <div className={styles.spectrumLabel}>
                파도 에너지 분포
                <span className={styles.spectrumClickHint}>탭하여 자세히 보기 →</span>
              </div>
              <div className={styles.spectrumInfoRow}>
                <span className={styles.spectrumInfoChip} style={{ borderColor: '#44aadd55', color: '#44aadd' }}>
                  실제 파도 주기&nbsp;<strong>{T1_s}초</strong>
                </span>
                {enc && Te_s && (
                  <span className={styles.spectrumInfoChip} style={{ borderColor: '#ff884455', color: '#ff8844' }}>
                    선박 체감 주기&nbsp;<strong>{Te_s}초</strong>
                    &nbsp;·&nbsp;{enc.regime}
                  </span>
                )}
              </div>

              {/* ── SVG 차트 ── */}
              <svg viewBox={`0 0 ${CW} ${CH}`} className={styles.spectrumChart}>
                <defs>
                  <linearGradient id="isscFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#44aadd" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#44aadd" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="encFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ff8844" stopOpacity="0.40" />
                    <stop offset="100%" stopColor="#ff8844" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* 격자선 */}
                {[0.25, 0.5, 0.75].map(r => (
                  <line key={r} x1="0" y1={CH * r} x2={CW} y2={CH * r}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                {/* x축 눈금 (주기(초) 표기 → 직관적) */}
                {ticks.map(w => {
                  const x   = omegaToX(w)
                  const sec = (2 * Math.PI / w).toFixed(1)
                  return (
                    <g key={w}>
                      <line x1={x} y1={CH - 3} x2={x} y2={CH}
                            stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                      <text x={x} y={CH - 4} textAnchor="middle"
                            fill="rgba(255,255,255,0.28)" fontSize="5.5">{sec}s</text>
                    </g>
                  )
                })}

                {/* 실제 파도 에너지 (파란색) */}
                <path d={fillPath} fill="url(#isscFill)" />
                <path d={linePath} fill="none" stroke="#44aadd" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
                <line x1={pk.x.toFixed(1)} y1={pk.y.toFixed(1)} x2={pk.x.toFixed(1)} y2={CH}
                      stroke="#44aadd" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                <circle cx={pk.x.toFixed(1)} cy={pk.y.toFixed(1)} r="2.5" fill="#44aadd" />
                <text x={Math.min(pk.x + 4, CW - 36)} y={pk.y - 4}
                      fill="#44aadd" fontSize="6" fontWeight="700">실제 정점</text>

                {/* 선박 체감 파도 에너지 (주황색) */}
                {encLine && (
                  <>
                    <path d={encFill} fill="url(#encFill)" />
                    <path d={encLine} fill="none" stroke="#ff8844" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
                    <line x1={encPkX} y1={encPkY} x2={encPkX} y2={CH}
                          stroke="#ff8844" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                    <circle cx={encPkX} cy={encPkY} r="3" fill="#ff8844" />
                    <text x={Math.min(parseFloat(encPkX) + 4, CW - 36)} y={parseFloat(encPkY) - 4}
                          fill="#ff8844" fontSize="6" fontWeight="700">체감 정점</text>
                  </>
                )}

                {/* x축 레이블 */}
                <text x="2"   y={CH - 1} fill="rgba(255,255,255,0.18)" fontSize="5">← 긴 파도</text>
                <text x={CW} y={CH - 1} textAnchor="end" fill="rgba(255,255,255,0.18)" fontSize="5">짧은 파도 →</text>
              </svg>

              {/* ── 범례 + 해설 ── */}
              <div className={styles.spectrumLegend}>
                <span className={styles.legendItem} style={{ color: '#44aadd' }}>
                  ━ 실제 파도 에너지
                </span>
                {enc && (
                  <span className={styles.legendItem} style={{ color: '#ff8844' }}>
                    ━ 선박 체감 에너지
                  </span>
                )}
              </div>
              {enc && (
                <div className={styles.spectrumHint}>
                  {enc.regime === '선수파' && '주황 곡선이 오른쪽으로 이동 → 파도가 실제보다 빠르게 느껴짐'}
                  {enc.regime === '선미파' && '주황 곡선이 왼쪽으로 이동 → 파도가 실제보다 느리게 느껴짐'}
                  {enc.regime === '횡파'   && '주황 곡선이 거의 이동 없음 · 횡파 → 롤링 위험 구간'}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── 탱크 SVG ── */}
        <svg
          viewBox="0 0 280 196"
          style={{
            width: '70%',
            marginTop: 8,
            marginBottom: 2,
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
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

          {/* 카고 용량 (탱크 내부, 액면 위에 겹침) */}
          <text x="140" y="84" textAnchor="middle"
                fill="rgb(255, 255, 255)" fontSize="24" fontWeight="800"
                fontFamily="'SF Mono','Fira Code','Consolas',monospace">
            {Math.round(currentMassT).toLocaleString()}
          </text>
          <text x="140" y="100" textAnchor="middle"
                fill="rgba(180,225,255,0.55)" fontSize="10" fontWeight="600" letterSpacing="1">
            ton
          </text>

          {/* 174,000 m³ 기준 소비량 */}
          <text x="140" y="114" textAnchor="middle"
                fill="rgba(180,225,255,0.35)" fontSize="7.5" fontWeight="600" letterSpacing="0.3">
            174,000 m³ 출발
          </text>
          {consumedVolM3 > 0 && (
            <text x="140" y="125" textAnchor="middle"
                  fill="rgba(255,120,80,0.72)" fontSize="7.5" fontWeight="700" letterSpacing="0.3">
              ▼ {consumedVolM3.toLocaleString()} m³ 소비
            </text>
          )}

          {/* 충전율 텍스트 */}
          <text x="140" y="148" textAnchor="middle"
                fill="rgba(255,255,255,0.3)" fontSize="9" fontWeight="700" letterSpacing="2">
            {(currentFillFrac * 100).toFixed(0)}% FILLED
          </text>
          <text x="140" y="172" textAnchor="middle"
                fill="rgba(100,180,220,0.25)" fontSize="7" fontWeight="700" letterSpacing="3">
            CARGO TANK
          </text>
        </svg>

      </section>

      <WaveInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentRegime={enc?.regime ?? null}
      />
    </div>
  )
}

function Cell({ label, val, unit, color, sub, wide, span2 }) {
  return (
    <div className={`${styles.cell} ${wide ? styles.cellWide : ''} ${span2 ? styles.cellSpan2 : ''}`}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellVal}>
        <span className={`${styles.cellNum} ${wide ? styles.cellNumWide : ''}`}
              style={color ? { color } : undefined}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
        {sub && <span className={styles.cellSub}>{sub}</span>}
      </span>
    </div>
  )
}

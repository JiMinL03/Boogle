import { useState, useEffect } from 'react'
import styles from './WaveInfoModal.module.css'

const WAVE_TYPES = [
  {
    key: 'beam',
    label: '횡파',
    sub: 'Beam sea',
    regime: '횡파',
    color: '#e24b4a',
    danger: '위험',
    motion: '롤링 (좌우 흔들림)',
    desc: '파도가 배의 측면을 정면으로 강타합니다. 배의 복원력(GM)이 약하면 큰 롤링이 발생하고 최악의 경우 전복 위험이 있습니다. 슬로싱 위험이 가장 높은 방향입니다.',
    effects: ['롤링 각도: 최대 30~40°', '전복 위험 가장 높음', '화물 쏠림·고박 파손', '조류 보정 파고 최대'],
    waveDir: 'left',
    anim: 'roll',
  },
  {
    key: 'head',
    label: '선수파',
    sub: 'Head sea',
    regime: '선수파',
    color: '#1d9e75',
    danger: '관리 가능',
    motion: '피칭 (앞뒤 흔들림)',
    desc: '파도가 배의 선수(앞)를 직접 치는 가장 일반적인 항해 상황입니다. 피칭이 발생하고 선수가 파도 위로 올라갔다 내려꽂히며 충격이 옵니다. 속도를 줄이면 대부분 안전하게 대응 가능합니다.',
    effects: ['피칭 → 선체 피로도 증가', '슬래밍 → 선수 충격', '속도 감소로 대응 가능', '연료 소모 증가'],
    waveDir: 'top',
    anim: 'pitch',
  },
  {
    key: 'following',
    label: '선미파',
    sub: 'Following sea',
    regime: '선미파',
    color: '#378add',
    danger: '중간 위험',
    motion: '선수방향 이탈·브로칭',
    desc: '파도가 배 뒤에서 밀어옵니다. 처음엔 속도를 높여줄 것 같지만, 파도 속도가 선박과 비슷해지면 배가 파도 사면을 타고 내려가며 브로칭(갑자기 횡방향 전환)이 발생합니다.',
    effects: ['브로칭 → 급격한 방향 전환', '선미 들림 → 조타 불량', '파도에 실려 전복 가능', '선미 다림 → 프로펠러 공회전'],
    waveDir: 'right',
    anim: 'sway',
  },
  {
    key: 'over',
    label: '침파',
    sub: 'Breaking sea',
    regime: null,
    color: '#ba7517',
    danger: '극위험',
    motion: '침수·전복',
    desc: '선수파가 너무 강해 파도가 갑판 위로 넘어오는 현상입니다. 파도 에너지가 제어되지 못할 때 발생하며, 해치(hatch) 침수·강제 장비 유실이 발생합니다.',
    effects: ['갑판 침수, 해치 파손', '갑판 장비 유실', '부력 감소 → 전복', '엔진룸 침수 위험'],
    waveDir: 'topLeft',
    anim: 'heave',
  },
]

function ShipSVG({ waveDir, anim, color }) {
  const bgWave = '#5a9bd6'
  const animClass = styles[`anim_${anim}`]

  // 파도 경로 세트
  const makeHWaves = (startX) => (
    <g className={styles.anim_waveH}>
      {[0, 25, 50].map((dy, i) => (
        <path key={i}
          d={`M${startX},${120 + dy} Q${startX+20},${100+dy} ${startX+40},${120+dy} Q${startX+60},${140+dy} ${startX+80},${120+dy} Q${startX+100},${100+dy} ${startX+120},${120+dy} Q${startX+140},${140+dy} ${startX+160},${120+dy} Q${startX+180},${100+dy} ${startX+200},${120+dy}`}
          fill="none" stroke={bgWave} strokeWidth={2.5 - i * 0.5} opacity={0.6 - i * 0.15}
        />
      ))}
    </g>
  )

  const makeVWaves = () => (
    <g className={styles.anim_waveV}>
      {[0, -30].map((dy, i) => (
        <path key={i}
          d={`M170,${dy} Q190,${20+dy} 210,${dy} Q230,${-20+dy} 250,${dy} Q270,${20+dy} 290,${dy} Q310,${-20+dy} 330,${dy} Q350,${20+dy} 370,${dy} Q390,${-20+dy} 410,${dy}`}
          fill="none" stroke={bgWave} strokeWidth={2.5 - i * 0.5} opacity={0.6 - i * 0.15}
        />
      ))}
    </g>
  )

  let wavesEl = null
  let arrowEl = null

  if (waveDir === 'left') {
    wavesEl = makeHWaves(-20)
    arrowEl = <line x1="60" y1="145" x2="148" y2="145" stroke={color} strokeWidth="2.5" markerEnd="url(#arrM)" />
  } else if (waveDir === 'right') {
    wavesEl = makeHWaves(380)
    arrowEl = <line x1="560" y1="145" x2="462" y2="145" stroke={color} strokeWidth="2.5" markerEnd="url(#arrM)" />
  } else if (waveDir === 'top') {
    wavesEl = makeVWaves()
    arrowEl = <line x1="310" y1="55" x2="310" y2="108" stroke={color} strokeWidth="2.5" markerEnd="url(#arrM)" />
  } else {
    wavesEl = makeHWaves(-20)
    arrowEl = <line x1="60" y1="110" x2="200" y2="130" stroke={color} strokeWidth="2.5" markerEnd="url(#arrM)" />
  }

  return (
    <svg width="100%" viewBox="0 0 620 240" className={styles.shipSvg}>
      <defs>
        <marker id="arrM" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {wavesEl}
      {arrowEl}

      <g className={animClass} style={{ transformOrigin: '50% 70%' }}>
        <polygon points="310,110 380,135 380,195 240,195 240,135"
                 fill="#d3d1c7" stroke="#5f5e5a" strokeWidth="1.2" opacity="0.9" />
        <polygon points="310,110 350,135 270,135"
                 fill="#b4b2a9" stroke="#5f5e5a" strokeWidth="0.8" />
        <rect x="265" y="150" width="90" height="30" rx="3"
              fill="#888780" stroke="#5f5e5a" strokeWidth="0.8" />
        <rect x="282" y="138" width="16" height="15" rx="2"
              fill="#73726c" stroke="#5f5e5a" strokeWidth="0.7" />
        <rect x="322" y="138" width="16" height="15" rx="2"
              fill="#73726c" stroke="#5f5e5a" strokeWidth="0.7" />
        <line x1="300" y1="138" x2="300" y2="118" stroke="#5f5e5a" strokeWidth="1.2" />
        <line x1="280" y1="195" x2="245" y2="205" stroke="#5f5e5a" strokeWidth="1.5" />
        <line x1="340" y1="195" x2="375" y2="205" stroke="#5f5e5a" strokeWidth="1.5" />
      </g>

      <rect x="220" y="205" width="180" height="6" rx="3" fill={bgWave} opacity="0.3" />
    </svg>
  )
}

export default function WaveInfoModal({ open, onClose, currentRegime }) {
  const initial = WAVE_TYPES.find(w => w.regime === currentRegime) ?? WAVE_TYPES[0]
  const [active, setActive] = useState(initial.key)

  // 현재 감지된 레짐이 바뀌면 탭 자동 이동
  useEffect(() => {
    const match = WAVE_TYPES.find(w => w.regime === currentRegime)
    if (match) setActive(match.key)
  }, [currentRegime])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const d = WAVE_TYPES.find(w => w.key === active)

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <div className={styles.header}>
          <span className={styles.title}>파도 방향별 선박 영향</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── 탭 ── */}
        <div className={styles.tabs}>
          {WAVE_TYPES.map(w => (
            <button
              key={w.key}
              className={`${styles.tab} ${active === w.key ? styles.tabActive : ''} ${w.regime === currentRegime ? styles.tabCurrent : ''}`}
              style={active === w.key ? { borderColor: w.color, color: w.color } : {}}
              onClick={() => setActive(w.key)}
            >
              {w.label}
              {w.regime === currentRegime && <span className={styles.tabDot} style={{ background: w.color }} />}
            </button>
          ))}
        </div>

        {/* ── 현재 감지 배너 ── */}
        {d.regime === currentRegime && (
          <div className={styles.currentBanner} style={{ borderColor: `${d.color}55`, background: `${d.color}10` }}>
            <span style={{ color: d.color }}>● 현재 감지된 파도 방향</span>
          </div>
        )}

        {/* ── 애니메이션 SVG ── */}
        <div className={styles.svgWrap} style={{ background: `${d.color}08` }}>
          <div className={styles.dangerRow}>
            <span className={styles.dangerLabel} style={{ color: d.color, borderColor: `${d.color}55` }}>
              {d.danger}
            </span>
            <span className={styles.motionLabel}>주요 운동: <strong style={{ color: d.color }}>{d.motion}</strong></span>
          </div>
          <ShipSVG waveDir={d.waveDir} anim={d.anim} color={d.color} />
        </div>

        {/* ── 설명 ── */}
        <div className={styles.body}>
          <p className={styles.desc}>{d.desc}</p>
          <div className={styles.effects}>
            {d.effects.map((e, i) => (
              <div key={i} className={styles.effectItem}>
                <span className={styles.effectDot} style={{ background: d.color }} />
                {e}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

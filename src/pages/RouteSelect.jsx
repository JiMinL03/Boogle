import { useState } from 'react'
import { ROUTES } from '../data/routes'
import styles from './RouteSelect.module.css'
import AnimatedLogo from '../components/AnimatedLogo'
import koreaFlag from '../assets/korea.png'

const ROUTE_COLOR = {
  'korea-bintulo':    '#2196F3',
  'korea-darwin':     '#4CAF50',
  'korea-india':      '#FF9800',
  'korea-ras-laffan': '#F44336',
  'korea-qalhat':     '#FF5722',
  'korea-europe':     '#9C27B0',
  'korea-rotterdam':  '#00BCD4',
}

export default function RouteSelect({ onConfirm }) {
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/route', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ routeId: selected }),
      })
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`)
      onConfirm(selected)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* 왼쪽: 카드 */}
      <div className={styles.left}>
      <div className={styles.card}>
        {/* 로고 */}
        <div className={styles.logo}>
          {'Boogle'.split('').map((c, i) => (
            <span key={i} style={{ color: ['#FF6B00','#4A90D9','#00BFA5','#F5A623','#9B6DFF','#F06292'][i] }}>
              {c}
            </span>
          ))}
        </div>
        <p className={styles.subtitle}>Ocean DX Academy 최강3기</p>

        {/* 항로 선택 폼 */}
        <div className={styles.form}>
          {/* 출항 (고정) */}
          <div className={styles.portBox}>
            <span className={styles.portLabel}>출항</span>
            <div className={styles.portFixed}>
              <img src={koreaFlag} alt="한국" className={styles.portFlag} />
              <div>
                <div className={styles.portName}>한국</div>
                <div className={styles.portSub}>평택 LNG 터미널</div>
              </div>
            </div>
          </div>

          <div className={styles.arrow}>↓</div>

          {/* 입항 (선택) */}
          <div className={styles.portBox}>
            <span className={styles.portLabel}>입항</span>
            <div className={styles.destGrid}>
              {ROUTES.filter(r => r.dest_ko).map(route => (
                <button
                  key={route.id}
                  className={`${styles.destBtn} ${selected === route.id ? styles.destBtnActive : ''}`}
                  style={selected === route.id ? {
                    borderColor: ROUTE_COLOR[route.id],
                    boxShadow:   `0 0 0 2px ${ROUTE_COLOR[route.id]}44`,
                  } : {}}
                  onClick={() => setSelected(route.id)}
                >
                  <span
                    className={styles.destColor}
                    style={{ background: ROUTE_COLOR[route.id] }}
                  />
                  <span className={styles.destName}>{route.dest_ko}</span>
                  <span className={styles.destSub}>{route.name_en.split('→')[1].trim()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className={styles.error}>⚠ {error}</div>}

        {/* 길 찾기 버튼 */}
        <button
          className={styles.submitBtn}
          disabled={!selected || loading}
          onClick={handleSubmit}
        >
          {loading ? '처리 중…' : '길 찾기'}
        </button>
      </div>
      </div>

      {/* 오른쪽: 애니메이션 로고 */}
      <div className={styles.right}>
        <AnimatedLogo />
      </div>
    </div>
  )
}

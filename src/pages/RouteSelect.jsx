import { useState } from 'react'
import { ROUTES } from '../data/routes'
import styles from './RouteSelect.module.css'
import AnimatedLogo from '../components/AnimatedLogo'

const ROUTE_COLOR = {
  'korea-bintulo':    '#2196F3',
  'korea-darwin':     '#4CAF50',
  'korea-india':      '#FF9800',
  'korea-ras-laffan': '#F44336',
  'korea-qalhat':     '#FF5722',
  'korea-europe':     '#9C27B0',
  'korea-rotterdam':  '#00BCD4',
}

const KOREAN_PORTS = ['평택터미널', '부산터미널']

// 항구별 허용 항로
const PORT_ROUTES = {
  '평택터미널': ROUTES.filter(r => r.id !== 'korea-rotterdam'),
  '부산터미널': ROUTES.filter(r => r.id === 'korea-rotterdam'),
}

export default function RouteSelect({ onConfirm }) {
  const [open,       setOpen]       = useState(null)   // 'korea' | 'dest' | null
  const [koreanPort, setKoreanPort] = useState('평택터미널')
  const [selected,   setSelected]   = useState(null)   // route id
  const [isSwapped,  setIsSwapped]  = useState(false)  // false: 출항=한국, 입항=목적지
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const selectedRoute = ROUTES.find(r => r.id === selected)

  // isSwapped=false: 왼쪽=출항(한국), 오른쪽=입항(목적지)
  // isSwapped=true:  왼쪽=출항(목적지), 오른쪽=입항(한국)
  const leftIsKorea = !isSwapped

  function handleLeftClick()  { setOpen(o => o === (leftIsKorea ? 'korea' : 'dest')  ? null : (leftIsKorea ? 'korea' : 'dest'))  }
  function handleRightClick() { setOpen(o => o === (!leftIsKorea ? 'korea' : 'dest') ? null : (!leftIsKorea ? 'korea' : 'dest')) }

  function handleSwap() {
    setIsSwapped(v => !v)
    // 반대 방향에서도 현재 koreanPort 제한을 적용
    if (selected && !PORT_ROUTES[koreanPort].find(r => r.id === selected)) {
      setSelected(null)
    }
    setOpen(null)
  }

  function selectKoreanPort(port) {
    setKoreanPort(port)
    // 기존 선택 항로가 새 항구에서 허용되지 않으면 초기화
    if (selected && !PORT_ROUTES[port].find(r => r.id === selected)) {
      setSelected(null)
    }
    setOpen(null)
  }

  function selectDest(routeId) {
    setSelected(routeId)
    // 로테르담 ↔ 부산터미널, 나머지 ↔ 평택터미널 자동 설정
    setKoreanPort(routeId === 'korea-rotterdam' ? '부산터미널' : '평택터미널')
    setOpen(null)
  }

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
      onConfirm({ routeId: selected, reversed: isSwapped, koreanPort })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  // 왼쪽/오른쪽 표시값
  const leftValue  = leftIsKorea  ? koreanPort              : (selectedRoute?.dest_ko ?? '출발지')
  const rightValue = !leftIsKorea ? koreanPort              : (selectedRoute?.dest_ko ?? '목적지')
  const leftOpen   = open === (leftIsKorea ? 'korea' : 'dest')
  const rightOpen  = open === (!leftIsKorea ? 'korea' : 'dest')

  return (
    <div className={styles.page}>
      <div className={styles.logoSection}>
        <AnimatedLogo />
      </div>

      <div className={styles.panel}>

        {/* 검색바 */}
        <div className={styles.searchBar}>
          {/* 왼쪽 (출항) */}
          <button
            className={`${styles.portBtn} ${leftOpen ? styles.portBtnActive : ''}`}
            onClick={handleLeftClick}
          >
            <span className={styles.portBtnLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              출항
            </span>
            <span className={styles.portBtnValue}>{leftValue}</span>
          </button>

          {/* 스왑 */}
          <button
            className={`${styles.swapBtn} ${isSwapped ? styles.swapBtnOn : ''}`}
            onClick={handleSwap}
            title="출항/입항 전환"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>

          {/* 오른쪽 (입항) */}
          <button
            className={`${styles.portBtn} ${rightOpen ? styles.portBtnActive : ''}`}
            onClick={handleRightClick}
          >
            <span className={styles.portBtnLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              입항
            </span>
            <span className={styles.portBtnValue}>{rightValue}</span>
          </button>
        </div>

        {/* 드롭다운: 한국 항구 선택 */}
        {open === 'korea' && (
          <div className={styles.dropdown}>
            <div className={styles.dropLabel}>한국 항구 선택</div>
            <div className={styles.koreanList}>
              {KOREAN_PORTS.map(port => (
                <button
                  key={port}
                  className={`${styles.koreanItem} ${koreanPort === port ? styles.koreanItemActive : ''}`}
                  onClick={() => selectKoreanPort(port)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <span>{port}</span>
                  {koreanPort === port && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'auto'}}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 드롭다운: 목적지 선택 */}
        {open === 'dest' && (
          <div className={styles.dropdown}>
            <div className={styles.dropLabel}>{leftIsKorea ? '목적지 선택' : '출발지 선택'}</div>
            <div className={styles.routeList}>
              {PORT_ROUTES[koreanPort].map(route => (
                <button
                  key={route.id}
                  className={`${styles.routeItem} ${selected === route.id ? styles.routeItemActive : ''}`}
                  style={selected === route.id ? {
                    borderColor: ROUTE_COLOR[route.id],
                    boxShadow:   `0 0 0 2px ${ROUTE_COLOR[route.id]}33`,
                  } : {}}
                  onClick={() => selectDest(route.id)}
                >
                  <div className={styles.routeLeft}>
                    <span className={styles.routeDot} style={{ background: ROUTE_COLOR[route.id] }} />
                    <div>
                      <div className={styles.routeName}>{route.dest_ko}</div>
                      <div className={styles.routeEn}>{route.name_en}</div>
                    </div>
                  </div>
                  <span className={styles.routeCoord}>
                    {route.dest.lat.toFixed(1)}°N&nbsp;{route.dest.lon.toFixed(1)}°E
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className={styles.error}>⚠ {error}</div>}

        <button
          className={styles.submitBtn}
          disabled={!selected || loading}
          onClick={handleSubmit}
        >
          {loading ? '처리 중…' : '길 찾기'}
        </button>
      </div>
    </div>
  )
}

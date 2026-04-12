import { useState, useCallback, useEffect } from 'react'
import Globe from './components/Globe'
import ControlsHint from './components/ControlsHint'
import SidePanel from './components/SidePanel'
import RouteSelect from './pages/RouteSelect'
import styles from './App.module.css'

export default function App() {
  const [page,         setPage]         = useState('select')
  const [routeId,      setRouteId]      = useState(null)
  const [reversed,     setReversed]     = useState(false)
  const [koreanPort,   setKoreanPort]   = useState('평택터미널')
  const [coords,       setCoords]       = useState(null)
  const [onLand,       setOnLand]       = useState(false)
  const [shipPosition, setShipPosition] = useState(null)
  const [isRunning,    setIsRunning]    = useState(false)
  const [voyageKey,    setVoyageKey]    = useState(0)
  const [scrubSeconds, setScrubSeconds] = useState(0)

  useEffect(() => {
    fetch('/api/route')
      .then(r => r.json())
      .then(({ routeId }) => {
        if (routeId) { setRouteId(routeId); setPage('map') }
      })
      .catch(() => {})
  }, [])

  const handleConfirm      = useCallback(({ routeId: id, reversed: rev, koreanPort: kp }) => { setRouteId(id); setReversed(rev); setKoreanPort(kp); setPage('map'); setIsRunning(false); setVoyageKey(k => k + 1); setScrubSeconds(0) }, [])
  const handleReselect     = useCallback(() => { setIsRunning(false); setPage('select') }, [])
  const handleCoordsChange = useCallback(setCoords,       [])
  const handleLandWarning  = useCallback(setOnLand,       [])
  const handleShipPosition = useCallback(setShipPosition, [])

  if (page === 'select') return <RouteSelect onConfirm={handleConfirm} />

  return (
    <>
      <Globe
        onCoordsChange={handleCoordsChange}
        onLandWarning={handleLandWarning}
        onShipPosition={handleShipPosition}
        routeId={routeId}
        reversed={reversed}
        isRunning={isRunning}
        scrubSeconds={scrubSeconds}
      />

      <ControlsHint />

      <SidePanel
        routeId={routeId}
        reversed={reversed}
        koreanPort={koreanPort}
        shipPosition={shipPosition}
        coords={coords}
        isRunning={isRunning}
        voyageKey={voyageKey}
        scrubSeconds={scrubSeconds}
        onScrubChange={setScrubSeconds}
      />

      {onLand && (
        <div className={styles.landWarning}>
          ⚠ 육지에는 진입할 수 없습니다
        </div>
      )}

      <div className={styles.controlBar}>
        <button className={styles.reselectBtn} onClick={handleReselect}>
          항로 재선택
        </button>
        <button
          className={`${styles.runBtn} ${isRunning ? styles.runBtnStop : styles.runBtnStart}`}
          onClick={() => setIsRunning(r => !r)}
        >
          {isRunning ? '■ 중단' : '▶ 시작'}
        </button>
      </div>
    </>
  )
}

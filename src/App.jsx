import { useState, useCallback, useEffect } from 'react'
import Globe from './components/Globe'
import Legend from './components/Legend'
import ControlsHint from './components/ControlsHint'
import Coords from './components/Coords'
import WeatherLog from './components/WeatherLog'
import RouteSelect from './pages/RouteSelect'
import styles from './App.module.css'

export default function App() {
  const [page,         setPage]         = useState('select') // 'select' | 'map'
  const [routeId,      setRouteId]      = useState(null)
  const [coords,       setCoords]       = useState(null)
  const [onLand,       setOnLand]       = useState(false)
  const [shipPosition, setShipPosition] = useState(null)
  const [isRunning,    setIsRunning]    = useState(false)

  // 새로고침 시 서버에서 저장된 항로 복원
  useEffect(() => {
    fetch('/api/route')
      .then(r => r.json())
      .then(({ routeId }) => {
        if (routeId) {
          setRouteId(routeId)
          setPage('map')
        }
      })
      .catch(() => {}) // 서버 미실행 시 선택 화면 유지
  }, [])

  const handleConfirm = useCallback((id) => {
    setRouteId(id)
    setPage('map')
    setIsRunning(false)
  }, [])

  const handleReselect = useCallback(() => {
    setIsRunning(false)
    setPage('select')
  }, [])

  const handleCoordsChange = useCallback(setCoords,       [])
  const handleLandWarning  = useCallback(setOnLand,       [])
  const handleShipPosition = useCallback(setShipPosition, [])

  if (page === 'select') {
    return <RouteSelect onConfirm={handleConfirm} />
  }

  return (
    <>
      <Globe
        onCoordsChange={handleCoordsChange}
        onLandWarning={handleLandWarning}
        onShipPosition={handleShipPosition}
        routeId={routeId}
        isRunning={isRunning}
      />
      <Legend />
      <ControlsHint />
      <Coords coords={coords} shipPosition={shipPosition} />

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

      <WeatherLog shipPosition={shipPosition} isRunning={isRunning} />
    </>
  )
}

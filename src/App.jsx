import { useState, useCallback, useEffect } from 'react'
import Globe from './components/Globe'
import ControlsHint from './components/ControlsHint'
import SidePanel from './components/SidePanel'
import EnginePanel from './components/EnginePanel'
import ThermalPanel from './components/ThermalPanel'
import SloshingPanel from './components/SloshingPanel'
import BOGPanel from './components/BOGPanel'
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
  const [isRunning,      setIsRunning]      = useState(false)
  const [voyageComplete, setVoyageComplete] = useState(false)
  const [voyageKey,      setVoyageKey]      = useState(0)
  const [scrubSeconds,   setScrubSeconds]   = useState(0)
  const [elapsedMs,      setElapsedMs]      = useState(0)
  const [latestWeather,  setLatestWeather]  = useState(null)
  const [thermalData,    setThermalData]    = useState(null)
  const [sloshingData,   setSloshingData]   = useState(null)

  useEffect(() => {
    fetch('/api/route')
      .then(r => r.json())
      .then(({ routeId }) => {
        if (routeId) { setRouteId(routeId); setPage('map') }
      })
      .catch(() => {})
  }, [])

  const handleWeatherChange  = useCallback(setLatestWeather, [])
  const handleConfirm        = useCallback(({ routeId: id, reversed: rev, koreanPort: kp }) => { setRouteId(id); setReversed(rev); setKoreanPort(kp); setPage('map'); setIsRunning(false); setVoyageComplete(false); setVoyageKey(k => k + 1); setScrubSeconds(0); setElapsedMs(0) }, [])
  const handleReselect       = useCallback(() => { setIsRunning(false); setVoyageComplete(false); setPage('select') }, [])
  const handleCoordsChange   = useCallback(setCoords,       [])
  const handleLandWarning    = useCallback(setOnLand,       [])
  const handleShipPosition   = useCallback(setShipPosition, [])
  const handleVoyageComplete = useCallback(() => { setIsRunning(false); setVoyageComplete(true) }, [])

  if (page === 'select') return <RouteSelect onConfirm={handleConfirm} />

  return (
    <>
      <Globe
        onCoordsChange={handleCoordsChange}
        onLandWarning={handleLandWarning}
        onShipPosition={handleShipPosition}
        onVoyageComplete={handleVoyageComplete}
        routeId={routeId}
        reversed={reversed}
        isRunning={isRunning}
        scrubSeconds={scrubSeconds}
      />

      <ControlsHint />

      <div className={styles.leftPanels}>
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
          onElapsedChange={setElapsedMs}
          onWeatherChange={handleWeatherChange}
        />
        <EnginePanel
          routeId={routeId}
          elapsedMs={elapsedMs}
          isRunning={isRunning}
        />
      </div>

      <div className={styles.rightPanels}>
        <ThermalPanel weather={latestWeather} onThermalChange={setThermalData} />
        <SloshingPanel weather={latestWeather} onSloshingChange={setSloshingData} />
        <BOGPanel thermalData={thermalData} sloshingData={sloshingData} />
      </div>

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
          className={`${styles.runBtn} ${voyageComplete ? styles.runBtnComplete : isRunning ? styles.runBtnStop : styles.runBtnStart}`}
          onClick={() => {
            if (voyageComplete) {
              alert('항해가 완료되었습니다. 항로를 재선택해 주세요.')
              return
            }
            setIsRunning(r => !r)
          }}
        >
          {voyageComplete ? '✓ 도착 완료' : isRunning ? '■ 중단' : '▶ 시작'}
        </button>
      </div>
    </>
  )
}

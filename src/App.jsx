import { useState, useCallback, useEffect } from 'react'
import { ROUTES } from './data/routes'
import Globe from './components/Globe'
import ControlsHint from './components/ControlsHint'
import SidePanel from './components/SidePanel'
import EnginePanel from './components/EnginePanel'
import ThermalPanel from './components/ThermalPanel'
import SloshingPanel from './components/SloshingPanel'
import BOGPanel from './components/BOGPanel'
import WeatherPanel from './components/WeatherPanel'
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
  const [bogData,        setBogData]        = useState(null)
  const [leftVisible,    setLeftVisible]    = useState(true)
  const [rightVisible,   setRightVisible]   = useState(true)
  const [editMode,          setEditMode]          = useState(false)
  const [customCoords,      setCustomCoords]      = useState(null)
  const [isAutoNavigating,  setIsAutoNavigating]  = useState(false)

  useEffect(() => {
    fetch('/api/route')
      .then(r => r.json())
      .then(({ routeId }) => {
        if (routeId) { setRouteId(routeId); setPage('map') }
      })
      .catch(() => {})
  }, [])

  const handleWeatherChange  = useCallback(setLatestWeather, [])
  const handleConfirm        = useCallback(({ routeId: id, reversed: rev, koreanPort: kp }) => { setRouteId(id); setReversed(rev); setKoreanPort(kp); setPage('map'); setIsRunning(false); setVoyageComplete(false); setVoyageKey(k => k + 1); setScrubSeconds(0); setElapsedMs(0); setLatestWeather(null); setThermalData(null); setSloshingData(null); setBogData(null); setEditMode(false); setCustomCoords(null) }, [])
  const handleReselect       = useCallback(() => { setIsRunning(false); setVoyageComplete(false); setLatestWeather(null); setThermalData(null); setSloshingData(null); setBogData(null); setPage('select'); setEditMode(false); setCustomCoords(null) }, [])
  const handleRouteEdit      = useCallback(setCustomCoords, [])
  const handleAutoStepChange = useCallback(step => setIsAutoNavigating(!!step), [])
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
        editMode={editMode}
        customCoords={customCoords}
        onRouteEdit={handleRouteEdit}
      />

      <ControlsHint />
      <WeatherPanel latestWeather={latestWeather} />

      {leftVisible && (
        <div className={styles.leftPanels}>
          <SidePanel
            routeId={routeId}
            reversed={reversed}
            koreanPort={koreanPort}
            shipPosition={shipPosition}
            coords={coords}
            isRunning={isRunning}
            voyageComplete={voyageComplete}
            voyageKey={voyageKey}
            scrubSeconds={scrubSeconds}
            onScrubChange={setScrubSeconds}
            onElapsedChange={setElapsedMs}
            onWeatherChange={handleWeatherChange}
            customCoords={customCoords}
            onAutoStepChange={handleAutoStepChange}
          />
          <EnginePanel bogData={bogData} isRunning={isRunning} />
          <ThermalPanel weather={latestWeather} onThermalChange={setThermalData} />
        </div>
      )}

      <button
        className={`${styles.toggleTab} ${styles.toggleTabLeft}`}
        style={{ left: leftVisible ? '305px' : '0px' }}
        onClick={() => setLeftVisible(v => !v)}
        title={leftVisible ? '왼쪽 패널 숨기기' : '왼쪽 패널 보이기'}
      >
        {leftVisible ? '‹' : '›'}
      </button>

      {rightVisible && (
        <div className={styles.rightPanels}>
          <SloshingPanel weather={latestWeather} onSloshingChange={setSloshingData} bogData={bogData} elapsedMs={elapsedMs} key={`sloshing-${voyageKey}`} shipHeading={shipPosition?.heading ?? null} reversed={reversed} />
          <BOGPanel thermalData={thermalData} sloshingData={sloshingData} onBOGChange={setBogData} elapsedMs={elapsedMs} key={`bog-${voyageKey}`} />
        </div>
      )}

      <button
        className={`${styles.toggleTab} ${styles.toggleTabRight}`}
        style={{ right: rightVisible ? '405px' : '0px' }}
        onClick={() => setRightVisible(v => !v)}
        title={rightVisible ? '오른쪽 패널 숨기기' : '오른쪽 패널 보이기'}
      >
        {rightVisible ? '›' : '‹'}
      </button>

      {coords && (
        <div className={styles.cursorCoords}>
          {Math.abs(coords.lat)}°{parseFloat(coords.lat) >= 0 ? 'N' : 'S'}
          &nbsp;&nbsp;
          {Math.abs(coords.lon)}°{parseFloat(coords.lon) >= 0 ? 'E' : 'W'}
        </div>
      )}

      {onLand && (
        <div className={styles.landWarning}>
          ⚠ 육지에는 진입할 수 없습니다
        </div>
      )}

      <div className={styles.controlBar}>
        <button className={styles.reselectBtn} onClick={handleReselect}>
          항로 재선택
        </button>

        {/* ── 편집 모드 버튼 ── */}
        {!isRunning && !isAutoNavigating && !voyageComplete && !editMode && (
          <button
            className={`${styles.reselectBtn} ${styles.editBtn}`}
            onClick={() => {
              if (!customCoords) {
                const route = ROUTES.find(r => r.id === routeId)
                if (route) {
                  const coords = reversed ? [...route.coords].reverse() : route.coords
                  setCustomCoords([...coords])
                }
              }
              setEditMode(true)
            }}
          >
            ✏ 항로 편집
          </button>
        )}

        {editMode && (
          <>
            <span className={styles.editHint}>클릭으로 경유지 추가</span>
            <button
              className={`${styles.reselectBtn} ${styles.editUndoBtn}`}
              disabled={!customCoords || customCoords.length <= (shipPosition?.wpIdx ?? 0) + 1}
              onClick={() => {
                const minLen = (shipPosition?.wpIdx ?? 0) + 1
                setCustomCoords(prev => prev && prev.length > minLen ? prev.slice(0, -1) : prev)
              }}
            >
              ↩ 취소
            </button>
            <button
              className={`${styles.reselectBtn} ${styles.editResetBtn}`}
              onClick={() => {
                const route = ROUTES.find(r => r.id === routeId)
                if (route) {
                  const coords = reversed ? [...route.coords].reverse() : route.coords
                  setCustomCoords([...coords])
                }
              }}
            >
              원래 항로
            </button>
            <button
              className={`${styles.reselectBtn} ${styles.editDoneBtn}`}
              onClick={() => setEditMode(false)}
            >
              ✓ 완료
            </button>
          </>
        )}

        <button
          className={`${styles.runBtn} ${voyageComplete ? styles.runBtnComplete : isRunning ? styles.runBtnStop : styles.runBtnStart}`}
          disabled={editMode}
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

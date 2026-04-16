import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

const NOOP = () => {}

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
  const [expandedPanel,  setExpandedPanel]  = useState(null)

  const openPanel = useCallback((name) => (e) => {
    if (e.target.closest('button, input, select, a, [role="button"]')) return
    setExpandedPanel(name)
  }, [])

const handleWeatherChange  = useCallback(setLatestWeather, [])
  const handleConfirm        = useCallback(({ routeId: id, reversed: rev, koreanPort: kp }) => { setRouteId(id); setReversed(rev); setKoreanPort(kp); setPage('map'); setIsRunning(false); setVoyageComplete(false); setVoyageKey(k => k + 1); setScrubSeconds(0); setElapsedMs(0); setLatestWeather(null); setThermalData(null); setSloshingData(null); setBogData(null) }, [])
  const handleReselect       = useCallback(() => { setIsRunning(false); setVoyageComplete(false); setLatestWeather(null); setThermalData(null); setSloshingData(null); setBogData(null); setPage('select') }, [])
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
      <WeatherPanel latestWeather={latestWeather} />

      {leftVisible && (
        <div className={styles.leftPanels}>
          <div className={styles.panelClickWrapper} onClick={openPanel('side')}>
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
            />
          </div>
          <div className={styles.panelClickWrapper} onClick={openPanel('engine')}>
            <EnginePanel bogData={bogData} isRunning={isRunning} />
          </div>
          <div className={styles.panelClickWrapper} onClick={openPanel('thermal')}>
            <ThermalPanel weather={latestWeather} onThermalChange={setThermalData} />
          </div>
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
          <div className={styles.panelClickWrapper} onClick={openPanel('sloshing')}>
            <SloshingPanel weather={latestWeather} onSloshingChange={setSloshingData} bogData={bogData} elapsedMs={elapsedMs} key={`sloshing-${voyageKey}`} shipHeading={shipPosition?.heading ?? null} reversed={reversed} />
          </div>
          <div className={styles.panelClickWrapper} onClick={openPanel('bog')}>
            <BOGPanel thermalData={thermalData} sloshingData={sloshingData} onBOGChange={setBogData} elapsedMs={elapsedMs} key={`bog-${voyageKey}`} />
          </div>
        </div>
      )}

      {expandedPanel && createPortal(
        <div className={styles.panelBackdrop} onClick={() => setExpandedPanel(null)}>
          <div className={styles.panelExpandModal} onClick={e => e.stopPropagation()}>
            <button className={styles.panelExpandClose} onClick={() => setExpandedPanel(null)}>✕</button>
            <div className={styles.panelExpandContent}>
              {expandedPanel === 'side' && (
                <SidePanel
                  routeId={routeId} reversed={reversed} koreanPort={koreanPort}
                  shipPosition={shipPosition} coords={coords}
                  isRunning={isRunning} voyageComplete={voyageComplete}
                  voyageKey={voyageKey} scrubSeconds={scrubSeconds}
                  onScrubChange={NOOP} onElapsedChange={NOOP} onWeatherChange={NOOP}
                />
              )}
              {expandedPanel === 'engine' && (
                <EnginePanel bogData={bogData} isRunning={isRunning} />
              )}
              {expandedPanel === 'thermal' && (
                <ThermalPanel weather={latestWeather} onThermalChange={NOOP} />
              )}
              {expandedPanel === 'sloshing' && (
                <SloshingPanel
                  weather={latestWeather} onSloshingChange={NOOP}
                  bogData={bogData} elapsedMs={0}
                  shipHeading={shipPosition?.heading ?? null} reversed={reversed}
                />
              )}
              {expandedPanel === 'bog' && (
                <BOGPanel
                  thermalData={thermalData} sloshingData={sloshingData}
                  onBOGChange={NOOP} elapsedMs={0}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
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

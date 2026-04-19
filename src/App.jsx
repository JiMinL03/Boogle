import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Globe from './components/Globe'
import SidePanel from './components/SidePanel'
import EnginePanel from './components/EnginePanel'
import ThermalPanel from './components/ThermalPanel'
import SloshingPanel from './components/SloshingPanel'
import BOGPanel from './components/BOGPanel'
import WeatherPanel from './components/WeatherPanel'
import RouteSelect from './pages/RouteSelect'
import styles from './App.module.css'

const NOOP = () => {}

const PANEL_STYLE = {
  width: '300px',
  background: 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.05) 45%,rgba(255,255,255,0.09) 100%)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: '20px',
  backdropFilter: 'blur(28px) saturate(200%)',
  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.06),inset 0 1.5px 0 rgba(255,255,255,0.55),inset 0 -1px 0 rgba(255,255,255,0.08),inset 1px 0 0 rgba(255,255,255,0.12),inset 0 0 40px rgba(255,255,255,0.03)',
  overflow: 'clip',
  userSelect: 'none',
  marginBottom: '12px',
}
const SECTION_STYLE   = { padding: '13px 16px' }
const LABEL_STYLE     = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff5900', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }
const SUBLABEL_STYLE  = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: '10px', marginBottom: '6px' }
const DIVIDER_STYLE   = { height: '1px', background: 'rgba(255,255,255,0.08)', margin: '10px 0' }
const GRID3_STYLE     = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }
const CELL_STYLE      = { background: 'linear-gradient(135deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '10px', padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '3px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25),inset 0 -1px 0 rgba(255,255,255,0.03)' }
const CELL_LBL_STYLE  = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em', color: 'rgb(182,182,182)' }
const CELL_VAL_STYLE  = { display: 'flex', alignItems: 'baseline', gap: '2px' }
const CELL_NUM_STYLE  = { fontSize: '14px', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }
const CELL_UNIT_STYLE = { fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }

function WCell({ label, val, unit }) {
  return (
    <div style={CELL_STYLE}>
      <span style={CELL_LBL_STYLE}>{label}</span>
      <span style={CELL_VAL_STYLE}>
        <span style={CELL_NUM_STYLE}>{val ?? '--'}</span>
        {unit && <span style={CELL_UNIT_STYLE}>{unit}</span>}
      </span>
    </div>
  )
}

function WeatherMini({ w }) {
  if (!w) return null
  return (
    <div style={PANEL_STYLE}>
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>
          기상 데이터
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'none', letterSpacing: 0 }}>{w.time}</span>
        </div>
        <div style={SUBLABEL_STYLE}>대기 · 해양</div>
        <div style={GRID3_STYLE}>
          <WCell label="외기온도" val={w.temp}      unit="°C"  />
          <WCell label="해수온도" val={w.seaTemp}   unit="°C"  />
          <WCell label="풍속"     val={w.windSpeed} unit="m/s" />
          <WCell label="돌풍"     val={w.windGust ?? '--'} unit={w.windGust != null ? 'm/s' : ''} />
        </div>
        <div style={DIVIDER_STYLE} />
        <div style={SUBLABEL_STYLE}>방향</div>
        <div style={GRID3_STYLE}>
          <WCell label="풍향" val={w.windDir}    unit="" />
          <WCell label="파향" val={w.waveDir ?? '--'} unit="" />
          <WCell label="유향" val={w.currentDir ?? '--'} unit="" />
        </div>
      </div>
    </div>
  )
}

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

<WeatherPanel latestWeather={latestWeather} />

      {leftVisible && (
        <div className={styles.leftPanels}>
          <div className={`${styles.panelClickWrapper} ${styles.panelNoExpand}`}>
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
          <div className={`${styles.panelClickWrapper} ${styles.panelNoExpand}`}>
            <BOGPanel thermalData={thermalData} sloshingData={sloshingData} onBOGChange={setBogData} elapsedMs={elapsedMs} key={`bog-${voyageKey}`} />
          </div>
        </div>
      )}

      {expandedPanel && createPortal(
        <div className={styles.panelBackdrop} onClick={() => setExpandedPanel(null)}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }} onClick={e => e.stopPropagation()}>

            {/* ── 메인 분석 패널 ── */}
            <div className={styles.panelExpandModal}>
              <button className={styles.panelExpandClose} onClick={() => setExpandedPanel(null)}>✕</button>
              <div
                className={styles.panelExpandContent}
                style={expandedPanel === 'sloshing' ? { zoom: 1.2, maxHeight: 'calc(86vh / 1.2)' } : undefined}
              >
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
              </div>
            </div>

            {/* ── 기상 데이터 패널 (오른쪽) ── */}
            {(expandedPanel === 'thermal' || expandedPanel === 'sloshing') && (
              <div style={{ zoom: expandedPanel === 'sloshing' ? 1.2 : 1.45 }}>
                <WeatherMini w={latestWeather} />
              </div>
            )}

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

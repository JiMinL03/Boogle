import { useState, useCallback, useRef } from 'react'
import Globe from './components/Globe'
import Header from './components/Header'
import Legend from './components/Legend'
import ControlsHint from './components/ControlsHint'
import Coords from './components/Coords'
import ShipPanel3D from './components/ShipPanel3D'
import ViewToggle from './components/ViewToggle'
import LocateShip from './components/LocateShip'
import styles from './App.module.css'

export default function App() {
  const [coords,      setCoords]      = useState(null)
  const [onLand,      setOnLand]      = useState(false)
  const [heading,     setHeading]     = useState(0)
  const [viewMode,    setViewMode]    = useState('globe')
  const locateRef = useRef(null)

  const handleCoordsChange = useCallback(setCoords, [])
  const handleShipMove     = useCallback(setHeading, [])
  const handleLandWarning  = useCallback(setOnLand,  [])

  return (
    <>
      <Globe
        onCoordsChange={handleCoordsChange}
        onShipMove={handleShipMove}
        onLandWarning={handleLandWarning}
        viewMode={viewMode}
        locateRef={locateRef}
      />
      <Header />
      <Legend />
      <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      <LocateShip locateRef={locateRef} />
      <ControlsHint />
      <Coords coords={coords} />

      {/* 육지 진입 경고 */}
      {onLand && (
        <div className={styles.landWarning}>
          ⚠ 육지에는 진입할 수 없습니다
        </div>
      )}

      {/* 3D 선박 패널 */}
      <ShipPanel3D heading={heading} />
    </>
  )
}

import { useState, useCallback } from 'react'
import Globe from './components/Globe'
import Legend from './components/Legend'
import ControlsHint from './components/ControlsHint'
import Coords from './components/Coords'
import WeatherLog from './components/WeatherLog'
import styles from './App.module.css'

export default function App() {
  const [coords,       setCoords]       = useState(null)
  const [onLand,       setOnLand]       = useState(false)
  const [shipPosition, setShipPosition] = useState(null)

  const handleCoordsChange = useCallback(setCoords,       [])
  const handleLandWarning  = useCallback(setOnLand,       [])
  const handleShipPosition = useCallback(setShipPosition, [])

  return (
    <>
      <Globe
        onCoordsChange={handleCoordsChange}
        onLandWarning={handleLandWarning}
        onShipPosition={handleShipPosition}
        viewMode="mercator"
      />
      <Legend />
      <ControlsHint />
      <Coords coords={coords} shipPosition={shipPosition} />

      {onLand && (
        <div className={styles.landWarning}>
          ⚠ 육지에는 진입할 수 없습니다
        </div>
      )}

      <WeatherLog shipPosition={shipPosition} />
    </>
  )
}

import { useState } from 'react'
import Globe from './components/Globe'
import Header from './components/Header'
import Legend from './components/Legend'
import ControlsHint from './components/ControlsHint'
import Coords from './components/Coords'

export default function App() {
  const [coords, setCoords] = useState(null)

  return (
    <>
      <Globe onCoordsChange={setCoords} />
      <Header />
      <Legend />
      <ControlsHint />
      <Coords coords={coords} />
    </>
  )
}

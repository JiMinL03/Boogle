import styles from './Coords.module.css'

export default function Coords({ coords }) {
  const text = coords
    ? `LAT ${coords.lat >= 0 ? '+' : ''}${coords.lat}°  LON ${coords.lon >= 0 ? '+' : ''}${coords.lon}°`
    : 'LAT —  LON —'

  return <div className={styles.coords}>{text}</div>
}

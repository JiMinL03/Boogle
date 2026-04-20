import styles from './WeatherBar.module.css'

function degToArrow(deg) {
  const dirs = ['↑','↗','→','↘','↓','↙','←','↖']
  return dirs[Math.round(((deg ?? 0) / 45)) % 8]
}

export default function WeatherBar({ latestWeather: w }) {
  if (!w) return null

  return (
    <div className={styles.bar}>
      <span className={styles.time}>{w.time}</span>
      <span className={styles.sep} />
      <Item label="외기온도" val={`${w.temp}°C`} />
      <Item label="해수온도" val={`${w.seaTemp}°C`} />
      <span className={styles.sep} />
      <Item label="풍속" val={`${w.windSpeed} m/s`} />
      {w.windGust != null && <Item label="돌풍" val={`${w.windGust} m/s`} />}
      <span className={styles.sep} />
      <DirItem label="풍향" deg={w.windDeg} dir={w.windDir} />
      <DirItem label="파향" deg={w.waveDeg ?? 0} dir={w.waveDir ?? '--'} />
      <DirItem label="유향" deg={w.currentDeg ?? 0} dir={w.currentDir ?? '--'} />
    </div>
  )
}

function Item({ label, val }) {
  return (
    <span className={styles.item}>
      <span className={styles.label}>{label}</span>
      <span className={styles.val}>{val}</span>
    </span>
  )
}

function DirItem({ label, deg, dir }) {
  return (
    <span className={styles.item}>
      <span className={styles.label}>{label}</span>
      <span className={styles.val}>
        <span className={styles.arrow} style={{ display: 'inline-block', transform: `rotate(${deg}deg)` }}>↑</span>
        {' '}{dir}
      </span>
    </span>
  )
}

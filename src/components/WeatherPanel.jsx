import styles from './WeatherPanel.module.css'

export default function WeatherPanel({ latestWeather: w }) {
  if (!w) return null

  const items = [
    { label: '외기온도', val: w.temp,                        unit: '°C'  },
    { label: '해수온도', val: w.seaTemp,                     unit: '°C'  },
    { label: '풍속',     val: w.windSpeed,                   unit: 'm/s' },
    { label: '돌풍',     val: w.windGust ?? '--',            unit: w.windGust != null ? 'm/s' : '' },
    {
      label: '풍향',
      val: (
        <span className={styles.dirVal}>
          <span className={styles.arrow} style={{ transform: `rotate(${w.windDeg}deg)` }}>↑</span>
          {w.windDir}
        </span>
      ),
    },
    {
      label: '파향',
      val: w.waveDeg != null ? (
        <span className={styles.dirVal}>
          <span className={styles.arrow} style={{ transform: `rotate(${w.waveDeg}deg)` }}>↑</span>
          {w.waveDir}
        </span>
      ) : '--',
    },
    {
      label: '유향',
      val: w.currentDeg != null ? (
        <span className={styles.dirVal}>
          <span className={styles.arrow} style={{ transform: `rotate(${w.currentDeg}deg)` }}>↑</span>
          {w.currentDir}
        </span>
      ) : '--',
    },
  ]

  return (
    <div className={styles.bar}>
      <span className={styles.time}>{w.time}</span>
      <span className={styles.sep} />
      {items.map((item, i) => (
        <div key={i} className={styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.val}>
            {typeof item.val === 'string' || typeof item.val === 'number' ? (
              <>
                <span className={styles.num}>{item.val}</span>
                {item.unit && <span className={styles.unit}>{item.unit}</span>}
              </>
            ) : item.val}
          </span>
        </div>
      ))}
    </div>
  )
}

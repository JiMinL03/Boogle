import styles from './WeatherPanel.module.css'

function Cell({ label, val, unit }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <div className={styles.cellVal}>
        <span className={styles.cellNum}>{val}</span>
        {unit && <span className={styles.cellUnit}>{unit}</span>}
      </div>
    </div>
  )
}

function DirCell({ label, deg, dir }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <div className={styles.dirVal}>
        <span className={styles.arrow} style={{ transform: `rotate(${deg}deg)` }}>↑</span>
        {dir}
      </div>
    </div>
  )
}

export default function WeatherPanel({ latestWeather: w }) {
  if (!w) return null

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.header}>
          기상 데이터
          <span className={styles.time}>{w.time}</span>
        </div>

        <div className={styles.blockLabel}>온도</div>
        <div className={styles.grid2}>
          <Cell label="외기온도" val={w.temp}    unit="°C" />
          <Cell label="해수온도" val={w.seaTemp} unit="°C" />
        </div>

        <div className={styles.blockLabel}>바람</div>
        <div className={styles.grid2}>
          <Cell label="풍속" val={w.windSpeed}          unit="m/s" />
          <Cell label="돌풍" val={w.windGust ?? '--'}   unit={w.windGust != null ? 'm/s' : ''} />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.blockLabel}>방향</div>
        <div className={styles.grid3}>
          <DirCell label="풍향" deg={w.windDeg}                dir={w.windDir} />
          <DirCell label="파향" deg={w.waveDeg    ?? 0}        dir={w.waveDir    ?? '--'} />
          <DirCell label="유향" deg={w.currentDeg ?? 0}        dir={w.currentDir ?? '--'} />
        </div>
      </div>
    </div>
  )
}

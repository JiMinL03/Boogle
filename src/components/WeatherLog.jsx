import { useState, useEffect, useRef } from 'react'
import styles from './WeatherLog.module.css'

const API_KEY = 'e3387311caed12676c89e7c4796e3f0f'
const MAX_LOGS     = 20
const INTERVAL_MS  = 3000  // 3초마다 수집

function degToDir(deg) {
  const ko = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서']
  return ko[Math.round(deg / 22.5) % 16]
}


async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&appid=${API_KEY}&units=metric&lang=kr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export default function WeatherLog({ shipPosition, isRunning }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const lastFetchTime = useRef(0)
  const fetchingRef   = useRef(false)

  useEffect(() => {
    if (!isRunning || !shipPosition || fetchingRef.current) return

    const elapsed = Date.now() - lastFetchTime.current
    if (elapsed < INTERVAL_MS) return

    const now = Date.now()
    lastFetchTime.current = now
    fetchingRef.current   = true

    setLoading(true)
    setError(null)

    const fetchTime = new Date()

    fetchWeather(shipPosition.lat, shipPosition.lon)
      .then(raw => {
        const entry = {
          id:        now,
          time:      formatTime(fetchTime),
          lat:       shipPosition.lat.toFixed(3),
          lon:       shipPosition.lon.toFixed(3),
          temp:      raw.main?.temp?.toFixed(1)        ?? '--',
          feelsLike: raw.main?.feels_like?.toFixed(1)  ?? '--',
          humidity:  raw.main?.humidity                ?? '--',
          pressure:  raw.main?.pressure                ?? '--',
          windSpeed: raw.wind?.speed?.toFixed(1)       ?? '--',
          windGust:  raw.wind?.gust != null ? raw.wind.gust.toFixed(1) : null,
          windDeg:   raw.wind?.deg ?? 0,
          windDir:   degToDir(raw.wind?.deg ?? 0),
          desc:      raw.weather?.[0]?.description     ?? '',
        }
        setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS))
      })
      .catch(e => setError(e.message))
      .finally(() => {
        setLoading(false)
        fetchingRef.current = false
      })
  }, [shipPosition, isRunning])

  const latest = logs[0]

  return (
    <div className={styles.panel}>
      {/* 헤더 */}
      <div className={styles.header}>
        <span className={styles.title}>
          <span className={`${styles.dot} ${loading ? styles.dotLoading : ''}`} />
          기상 수집 로그
        </span>
        <span className={styles.updatedAt}>
          {loading ? '수집 중…' : logs.length > 0 ? `${logs.length}건` : '대기 중'}
        </span>
      </div>

      {/* 바디 */}
      <div className={styles.body}>
        {error && <div className={styles.errorBar}>⚠ {error}</div>}

        {logs.length === 0 && !loading && !error && (
          <div className={styles.empty}>선박 이동 시 자동으로 수집됩니다</div>
        )}

        {logs.length === 0 && loading && (
          <div className={styles.empty}><span className={styles.spinner} /> 수집 중…</div>
        )}

        {/* 최신 데이터 — 상단 그리드 */}
        {latest && (
          <>
            <div className={styles.posRow}>
              {/* 현재 선박 위치 (실시간) */}
              <span className={styles.pos}>
                {shipPosition
                  ? `${shipPosition.lat >= 0 ? 'N' : 'S'}${Math.abs(shipPosition.lat).toFixed(3)}°\u00a0${shipPosition.lon >= 0 ? 'E' : 'W'}${Math.abs(shipPosition.lon).toFixed(3)}°`
                  : `${parseFloat(latest.lat) >= 0 ? 'N' : 'S'}${Math.abs(parseFloat(latest.lat))}°\u00a0${parseFloat(latest.lon) >= 0 ? 'E' : 'W'}${Math.abs(parseFloat(latest.lon))}°`
                }
              </span>
              {latest.desc && <span className={styles.desc}>{latest.desc}</span>}
              {loading && <span className={styles.spinner} />}
            </div>
            {/* 수집 시각 표시 */}
            <div className={styles.fetchedAt}>
              {latest.time} 수집 ({latest.lat >= 0 ? 'N' : 'S'}{Math.abs(parseFloat(latest.lat))}°&nbsp;
              {parseFloat(latest.lon) >= 0 ? 'E' : 'W'}{Math.abs(parseFloat(latest.lon))}° 기준)
            </div>

            <div className={styles.grid}>
              <Cell label="외기온도"  val={latest.temp}      unit="°C"  />
              <Cell label="체감온도"  val={latest.feelsLike} unit="°C"  />
              <Cell label="습도"      val={latest.humidity}  unit="%"   />
              <Cell label="기압"      val={latest.pressure}  unit="hPa" />
              <Cell label="풍속"      val={latest.windSpeed} unit="m/s" />
              <Cell
                label="풍향"
                val={
                  <span className={styles.windVal}>
                    <span className={styles.arrow} style={{ transform: `rotate(${latest.windDeg}deg)` }}>↑</span>
                    {latest.windDir}
                  </span>
                }
              />
              {latest.windGust != null && (
                <Cell label="돌풍" val={latest.windGust} unit="m/s" gust />
              )}
            </div>
          </>
        )}

        {/* 이전 수집 로그 목록 */}
        {logs.length > 1 && (
          <div className={styles.logSection}>
            <div className={styles.logDivider}>이전 수집 기록</div>
            <div className={styles.logList}>
              {logs.slice(1).map(entry => (
                <div key={entry.id} className={styles.logEntry}>
                  <span className={styles.logTime}>{entry.time}</span>
                  <span className={styles.logPos}>
                    {parseFloat(entry.lat) >= 0 ? 'N' : 'S'}{Math.abs(parseFloat(entry.lat))}°&nbsp;
                    {parseFloat(entry.lon) >= 0 ? 'E' : 'W'}{Math.abs(parseFloat(entry.lon))}°
                  </span>
                  <span className={styles.logTemp}>{entry.temp}°C</span>
                  <span className={styles.logWind}>{entry.windDir} {entry.windSpeed}m/s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Cell({ label, val, unit, gust }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={`${styles.cellVal} ${gust ? styles.gust : ''}`}>
        {typeof val === 'string' || typeof val === 'number' ? (
          <>
            <span className={styles.cellNum}>{val}</span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </>
        ) : val}
      </span>
    </div>
  )
}

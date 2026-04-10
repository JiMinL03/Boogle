import { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../data/routes'
import styles from './SidePanel.module.css'

// ── 거리 계산 ────────────────────────────────────────────────
function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}
function routeDistanceKm(coords) {
  let t = 0
  for (let i = 1; i < coords.length; i++)
    t += haversineKm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
  return t
}

// ── 방위 ─────────────────────────────────────────────────────
const DIRS = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서']
function headingToKo(deg) { return DIRS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16] }
function fmtLat(v) { return `${v >= 0 ? 'N' : 'S'} ${Math.abs(v).toFixed(3)}°` }
function fmtLon(v) { return `${v >= 0 ? 'E' : 'W'} ${Math.abs(v).toFixed(3)}°` }
function degToDir(deg) {
  return DIRS[Math.round(((deg ?? 0) / 22.5)) % 16]
}

// ── 기상 API ─────────────────────────────────────────────────
const API_KEY    = 'e3387311caed12676c89e7c4796e3f0f'
const INTERVAL   = 3000
const MAX_LOGS   = 20

async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&appid=${API_KEY}&units=metric&lang=kr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
function fmtTime(d) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ────────────────────────────────────────────────────────────
export default function SidePanel({ routeId, reversed, koreanPort, shipPosition, isRunning }) {
  const route  = ROUTES.find(r => r.id === routeId)
  const distKm = route ? Math.round(routeDistanceKm(route.coords)) : null
  const distNm = distKm ? Math.round(distKm / 1.852) : null
  const eta    = distNm ? (distNm / 16 / 24).toFixed(1) : null

  // 항로 표시명: reversed 여부와 항구명 반영
  const port      = koreanPort ?? '한국'
  const routeLabel = route
    ? (reversed ? `${route.dest_ko} → ${port}` : `${port} → ${route.dest_ko}`)
    : null

  const sp = shipPosition

  // 기상 상태
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const lastFetch = useRef(0)
  const fetching  = useRef(false)

  useEffect(() => {
    if (!isRunning || !sp || fetching.current) return
    if (Date.now() - lastFetch.current < INTERVAL) return

    const now = Date.now()
    lastFetch.current = now
    fetching.current  = true
    setLoading(true)
    setError(null)

    const t = new Date()
    fetchWeather(sp.lat, sp.lon)
      .then(raw => {
        const entry = {
          id:        now,
          time:      fmtTime(t),
          lat:       sp.lat.toFixed(3),
          lon:       sp.lon.toFixed(3),
          temp:      raw.main?.temp?.toFixed(1)       ?? '--',
          feelsLike: raw.main?.feels_like?.toFixed(1) ?? '--',
          humidity:  raw.main?.humidity               ?? '--',
          pressure:  raw.main?.pressure               ?? '--',
          windSpeed: raw.wind?.speed?.toFixed(1)      ?? '--',
          windGust:  raw.wind?.gust != null ? raw.wind.gust.toFixed(1) : null,
          windDeg:   raw.wind?.deg ?? 0,
          windDir:   degToDir(raw.wind?.deg ?? 0),
          desc:      raw.weather?.[0]?.description    ?? '',
        }
        setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS))
      })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); fetching.current = false })
  }, [sp, isRunning])

  const latest = logs[0]

  return (
    <div className={styles.panel}>

      {/* ── 항로 정보 ── */}
      {route && (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>항로</div>
          <div className={styles.routeName}>{routeLabel}</div>
          <div className={styles.distRow}>
            <Stat num={distKm?.toLocaleString()} unit="km" />
            <span className={styles.dot}>·</span>
            <Stat num={distNm?.toLocaleString()} unit="해리" />
            <span className={styles.dot}>·</span>
            <Stat num={`~${eta}`} unit="일 (16kt)" />
          </div>
        </section>
      )}

      <div className={styles.divider} />

      {/* ── 선박 정보 ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>선박</div>
        {sp ? (
          <>
            <div className={styles.coordRow}>
              <span className={styles.coordVal}>{fmtLat(sp.lat)}</span>
              <span className={styles.slash}>/</span>
              <span className={styles.coordVal}>{fmtLon(sp.lon)}</span>
            </div>
            <div className={styles.shipStatus}>
              <span
                className={styles.arrow}
                style={{ transform: `rotate(${sp.heading}deg)`, opacity: sp.moving ? 1 : 0.35 }}
              >↑</span>
              <span className={styles.dir}>{headingToKo(sp.heading)}</span>
              <span className={styles.deg}>{Math.round(sp.heading)}°</span>
              <span className={styles.sep}>·</span>
              <span className={`${styles.speed} ${sp.moving ? styles.moving : styles.stopped}`}>
                {sp.moving ? `${sp.knots ?? 16} 노트` : '정박'}
              </span>
            </div>
          </>
        ) : (
          <div className={styles.empty}>항해 시작 전</div>
        )}
      </section>

      <div className={styles.divider} />

      {/* ── 기상 수집 로그 ── */}
      <section className={styles.section}>


        {error && <div className={styles.errorBar}>⚠ {error}</div>}

        {logs.length === 0 && !loading && (
          <div className={styles.empty}>선박 이동 시 자동으로 수집됩니다</div>
        )}

        {latest && (
          <>
            <div className={styles.latestPos}>
              {parseFloat(latest.lat) >= 0 ? 'N' : 'S'}{Math.abs(parseFloat(latest.lat))}°&nbsp;
              {parseFloat(latest.lon) >= 0 ? 'E' : 'W'}{Math.abs(parseFloat(latest.lon))}°
              {latest.desc && <span className={styles.weatherDesc}> · {latest.desc}</span>}
            </div>
            <div className={styles.fetchedAt}>{latest.time} 수집</div>

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
                    <span className={styles.windArrow} style={{ transform: `rotate(${latest.windDeg}deg)` }}>↑</span>
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

      </section>

    </div>
  )
}

function Stat({ num, unit }) {
  return (
    <span className={styles.stat}>
      <span className={styles.statNum}>{num}</span>
      <span className={styles.statUnit}>{unit}</span>
    </span>
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
            {unit && <span className={styles.cellUnit}>{unit}</span>}
          </>
        ) : val}
      </span>
    </div>
  )
}

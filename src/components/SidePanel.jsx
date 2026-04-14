import { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../data/routes'
import { SHIP }   from '../constants/ship'
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
function degToDir(deg) {
  return DIRS[Math.round(((deg ?? 0) / 22.5)) % 16]
}

// ── 경과 시간 포맷 ───────────────────────────────────────────
function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── 기상 API ─────────────────────────────────────────────────
const API_KEY    = 'e3387311caed12676c89e7c4796e3f0f'
const INTERVAL   = 1500

async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&appid=${API_KEY}&units=metric&lang=kr`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchMarine(lat, lon) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=sea_surface_temperature,wave_direction,ocean_current_direction`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const c = data.current ?? {}
  return {
    seaTemp:        c.sea_surface_temperature    ?? null,
    waveDeg:        c.wave_direction             ?? null,
    currentDeg:     c.ocean_current_direction    ?? null,
  }
}
function fmtTime(d) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ────────────────────────────────────────────────────────────
export default function SidePanel({ routeId, reversed, koreanPort, shipPosition, isRunning, voyageKey, scrubSeconds, onScrubChange, onElapsedChange, onWeatherChange }) {
  const route  = ROUTES.find(r => r.id === routeId)
  const distKm = route ? Math.round(routeDistanceKm(route.coords)) : null
  const distNm = distKm ? Math.round(distKm / 1.852) : null
  const eta    = distNm ? (distNm / SHIP.knots / 24).toFixed(1) : null
  const totalVoyageSeconds = distNm ? Math.round(distNm / SHIP.knots * 3600) : 0

  // 항로 표시명: reversed 여부와 항구명 반영
  const port      = koreanPort ?? '한국'
  const routeLabel = route
    ? (reversed ? `${route.dest_ko} → ${port}` : `${port} → ${route.dest_ko}`)
    : null

  const sp = shipPosition

  // 항해 경과 시간
  const [elapsedMs,   setElapsedMs]   = useState(0)
  const runningStartRef  = useRef(null)
  const accumulatedMsRef = useRef(0)

  // 항해 이동 거리
  const [traveledKm,  setTraveledKm]  = useState(0)
  const prevPosRef    = useRef(null)
  const traveledKmRef = useRef(0)

  // 슬라이더를 직접 움직인 상태인지 추적 (라이브 카운트와 구분)
  const scrubActiveRef = useRef(false)

  // elapsedMs 변경 시 App으로 전파 (EnginePanel 등에서 활용)
  useEffect(() => { onElapsedChange?.(elapsedMs) }, [elapsedMs, onElapsedChange])

  // 새 항해 확정 시 초기화
  useEffect(() => {
    setElapsedMs(0)
    setTraveledKm(0)
    accumulatedMsRef.current = 0
    traveledKmRef.current    = 0
    runningStartRef.current  = null
    prevPosRef.current       = null
  }, [voyageKey])

  // 경과 시간 타이머 (시작/중단에 따라 누적)
  useEffect(() => {
    if (isRunning) {
      // 탐색 위치에서 시작하는 경우 해당 값으로 초기화
      if (scrubSeconds > 0) {
        accumulatedMsRef.current  = scrubSeconds * 1000
        traveledKmRef.current     = SHIP.knots * scrubSeconds / 3600 * 1.852
        prevPosRef.current        = null
        setTraveledKm(traveledKmRef.current)
      }
      scrubActiveRef.current = false  // 시작 시 스크럽 모드 해제 → 라이브 카운트 표시
      runningStartRef.current = Date.now()
      const id = setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - runningStartRef.current))
      }, 1000)
      return () => {
        clearInterval(id)
        if (runningStartRef.current !== null) {
          accumulatedMsRef.current += Date.now() - runningStartRef.current
          runningStartRef.current = null
        }
      }
    } else {
      setElapsedMs(accumulatedMsRef.current)
    }
  }, [isRunning])

  // 이동 거리 누적
  useEffect(() => {
    if (!sp) return
    if (!isRunning) { prevPosRef.current = null; return }
    if (prevPosRef.current) {
      const d = haversineKm(prevPosRef.current.lon, prevPosRef.current.lat, sp.lon, sp.lat)
      if (d < 500) {
        traveledKmRef.current += d
        setTraveledKm(traveledKmRef.current)
      }
    }
    prevPosRef.current = { lat: sp.lat, lon: sp.lon }
  }, [sp, isRunning])

  // 기상 상태
  const lastFetch = useRef(0)
  const fetching  = useRef(false)

  useEffect(() => {
    if ((!isRunning && scrubSeconds === 0) || !sp || fetching.current) return
    if (Date.now() - lastFetch.current < INTERVAL) return

    const now = Date.now()
    lastFetch.current = now
    fetching.current  = true

    const t = new Date()
    Promise.all([fetchWeather(sp.lat, sp.lon), fetchMarine(sp.lat, sp.lon)])
      .then(([raw, marine]) => {
        const entry = {
          id:         now,
          time:       fmtTime(t),
          lat:        sp.lat.toFixed(3),
          lon:        sp.lon.toFixed(3),
          temp:       raw.main?.temp?.toFixed(1)       ?? '--',
          seaTemp:    marine?.seaTemp != null ? marine.seaTemp.toFixed(1) : '--',
          windSpeed:  raw.wind?.speed?.toFixed(1)      ?? '--',
          windGust:   raw.wind?.gust != null ? raw.wind.gust.toFixed(1) : null,
          windDeg:    raw.wind?.deg ?? 0,
          windDir:    degToDir(raw.wind?.deg ?? 0),
          waveDeg:    marine?.waveDeg    ?? null,
          waveDir:    marine?.waveDeg    != null ? degToDir(marine.waveDeg)    : '--',
          currentDeg: marine?.currentDeg ?? null,
          currentDir: marine?.currentDeg != null ? degToDir(marine.currentDeg) : '--',
          desc:       raw.weather?.[0]?.description    ?? '',
        }
        onWeatherChange?.(entry)
      })
      .catch(() => {})
      .finally(() => { fetching.current = false })
  }, [sp, isRunning, scrubSeconds])

  const isScrubbing     = scrubSeconds > 0 && scrubActiveRef.current
  const scrubKm         = isScrubbing ? SHIP.knots * scrubSeconds / 3600 * 1.852 : traveledKm
  const scrubNm         = isScrubbing ? SHIP.knots * scrubSeconds / 3600         : traveledKm / 1.852
  const displayMs       = isScrubbing ? scrubSeconds * 1000 : elapsedMs
  const hasVoyageData   = elapsedMs > 0 || traveledKm > 0 || isScrubbing

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
            <Stat num={`~${eta}`} unit={`일 (${SHIP.knots}kt)`} />
          </div>
        </section>
      )}

      <div className={styles.divider} />

      {/* ── 항해 현황 ── */}
      {route && (
        <>
          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              항해 현황
              {isRunning && !isScrubbing && <span className={styles.liveDot} />}
              {isScrubbing && <span className={styles.scrubLabel}>탐색 중</span>}
            </div>

            {hasVoyageData && (
              <>
                <div className={styles.voyageTimeRow}>
                  <span className={styles.voyageTime}>{fmtElapsed(displayMs)}</span>
                  {displayMs >= 86400000 && (
                    <span className={styles.voyageDays}>{Math.floor(displayMs / 86400000)}일</span>
                  )}
                </div>
                <div className={styles.distRow}>
                  <Stat num={scrubKm.toFixed(1)} unit="km" />
                  <span className={styles.dot}>·</span>
                  <Stat num={scrubNm.toFixed(1)} unit="해리" />
                </div>
              </>
            )}

            <input
              type="range"
              className={styles.scrubber}
              min={0}
              max={totalVoyageSeconds}
              step={60}
              value={scrubSeconds}
              onChange={e => {
                const val = Number(e.target.value)
                onScrubChange(val)
                onElapsedChange?.(val * 1000)   // 중단 상태에서도 EnginePanel 실시간 업데이트
                if (isRunning) {
                  // 항해 중 탐색: 해당 위치부터 라이브 카운트 즉시 재시작
                  accumulatedMsRef.current = val * 1000
                  traveledKmRef.current    = SHIP.knots * val / 3600 * 1.852
                  if (runningStartRef.current !== null) runningStartRef.current = Date.now()
                  prevPosRef.current = null
                  setTraveledKm(traveledKmRef.current)
                  setElapsedMs(accumulatedMsRef.current)
                  scrubActiveRef.current = false
                } else {
                  scrubActiveRef.current = true
                }
              }}
            />
            <div className={styles.scrubTicks}>
              <span>출발</span>
              <span>{eta}일</span>
            </div>
          </section>
          <div className={styles.divider} />
        </>
      )}


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

import { ROUTES } from '../data/routes'
import { WAYPOINTS } from '../data/waypoints'
import styles from './InfoPanel.module.css'

// ── Haversine 거리 계산 ─────────────────────────────────────
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
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(
      coords[i - 1][0], coords[i - 1][1],
      coords[i][0],     coords[i][1]
    )
  }
  return total
}

// ── 방위각 → 16방위 ─────────────────────────────────────────
function compassDir(deg) {
  const dirs = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]
}

const TYPE_LABEL = { canal: '운하', strait: '해협', cape: '갑' }
const TYPE_COLOR = { canal: '#FF6B00', strait: '#4A90D9', cape: '#00BFA5' }

export default function InfoPanel({ open, onClose, routeId, shipPosition, logs }) {
  const route   = ROUTES.find(r => r.id === routeId)
  const distKm  = route ? Math.round(routeDistanceKm(route.coords)) : null
  const distNm  = distKm ? Math.round(distKm / 1.852) : null
  const etaDays = distNm ? (distNm / 16 / 24).toFixed(1) : null

  const sp = shipPosition

  return (
    <div className={`${styles.panel} ${open ? styles.open : ''}`}>
      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <span className={styles.title}>항해 정보</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.body}>

        {/* ── 항로 거리 ── */}
        {route && (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>항로 정보</div>
            <div className={styles.routeName}>{route.name_ko}</div>
            <div className={styles.distRow}>
              <div className={styles.distCell}>
                <span className={styles.distNum}>{distKm?.toLocaleString()}</span>
                <span className={styles.distUnit}>km</span>
              </div>
              <div className={styles.distCell}>
                <span className={styles.distNum}>{distNm?.toLocaleString()}</span>
                <span className={styles.distUnit}>해리</span>
              </div>
              <div className={styles.distCell}>
                <span className={styles.distNum}>~{etaDays}</span>
                <span className={styles.distUnit}>일 (16kt)</span>
              </div>
            </div>
          </section>
        )}

        {/* ── 선박 정보 ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>선박 정보</div>
          {sp ? (
            <div className={styles.shipGrid}>
              <InfoCell label="위도" val={`${sp.lat >= 0 ? 'N' : 'S'} ${Math.abs(sp.lat).toFixed(4)}°`} />
              <InfoCell label="경도" val={`${sp.lon >= 0 ? 'E' : 'W'} ${Math.abs(sp.lon).toFixed(4)}°`} />
              <InfoCell label="방위"
                val={`${compassDir(sp.heading)} (${Math.round(sp.heading)}°)`} />
              <InfoCell label="속력"
                val={sp.moving ? `${sp.knots ?? 16} kt` : '정박'} />
            </div>
          ) : (
            <div className={styles.empty}>항해 시작 후 표시됩니다</div>
          )}
        </section>

        {/* ── 기상 수집 로그 ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            기상 수집 로그
            <span className={styles.logCount}>{logs.length > 0 ? `${logs.length}건` : '없음'}</span>
          </div>
          {logs.length === 0 ? (
            <div className={styles.empty}>선박 이동 시 자동 수집됩니다</div>
          ) : (
            <>
              {/* 최신 1건 상세 */}
              <div className={styles.latestWeather}>
                <div className={styles.weatherRow}>
                  <span className={styles.weatherLabel}>수집 위치</span>
                  <span className={styles.weatherVal}>
                    {parseFloat(logs[0].lat) >= 0 ? 'N' : 'S'}{Math.abs(parseFloat(logs[0].lat))}°&nbsp;
                    {parseFloat(logs[0].lon) >= 0 ? 'E' : 'W'}{Math.abs(parseFloat(logs[0].lon))}°
                  </span>
                </div>
                <div className={styles.weatherRow}>
                  <span className={styles.weatherLabel}>온도 / 체감</span>
                  <span className={styles.weatherVal}>{logs[0].temp}°C / {logs[0].feelsLike}°C</span>
                </div>
                <div className={styles.weatherRow}>
                  <span className={styles.weatherLabel}>습도 / 기압</span>
                  <span className={styles.weatherVal}>{logs[0].humidity}% / {logs[0].pressure} hPa</span>
                </div>
                <div className={styles.weatherRow}>
                  <span className={styles.weatherLabel}>풍향 / 풍속</span>
                  <span className={styles.weatherVal}>{logs[0].windDir} {logs[0].windSpeed} m/s</span>
                </div>
                {logs[0].desc && (
                  <div className={styles.weatherRow}>
                    <span className={styles.weatherLabel}>날씨</span>
                    <span className={styles.weatherVal}>{logs[0].desc}</span>
                  </div>
                )}
                <div className={styles.weatherTime}>{logs[0].time} 수집</div>
              </div>

              {/* 이전 로그 목록 */}
              {logs.length > 1 && (
                <div className={styles.logList}>
                  {logs.slice(1).map(e => (
                    <div key={e.id} className={styles.logEntry}>
                      <span className={styles.logTime}>{e.time}</span>
                      <span className={styles.logPos}>
                        {parseFloat(e.lat) >= 0 ? 'N' : 'S'}{Math.abs(parseFloat(e.lat))}°&nbsp;
                        {parseFloat(e.lon) >= 0 ? 'E' : 'W'}{Math.abs(parseFloat(e.lon))}°
                      </span>
                      <span className={styles.logTemp}>{e.temp}°C</span>
                      <span className={styles.logWind}>{e.windDir} {e.windSpeed}m/s</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── 항로 마커 ── */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>항로 마커</div>
          <div className={styles.markerList}>
            {WAYPOINTS.map(wp => (
              <div key={wp.name} className={styles.markerItem}>
                <span
                  className={styles.markerDot}
                  style={{ background: TYPE_COLOR[wp.type] }}
                />
                <div className={styles.markerInfo}>
                  <span className={styles.markerName}>{wp.name_ko}</span>
                  <span className={styles.markerSub}>{wp.name}</span>
                </div>
                <div className={styles.markerMeta}>
                  <span
                    className={styles.markerType}
                    style={{ color: TYPE_COLOR[wp.type], borderColor: TYPE_COLOR[wp.type] + '55' }}
                  >
                    {TYPE_LABEL[wp.type]}
                  </span>
                  <span className={styles.markerCoords}>
                    {wp.lat >= 0 ? 'N' : 'S'}{Math.abs(wp.lat)}°&nbsp;
                    {wp.lon >= 0 ? 'E' : 'W'}{Math.abs(wp.lon)}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

function InfoCell({ label, val }) {
  return (
    <div className={styles.infoCell}>
      <span className={styles.infoCellLabel}>{label}</span>
      <span className={styles.infoCellVal}>{val}</span>
    </div>
  )
}

import styles from './Coords.module.css'

const DIR_KO = ['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서']

function headingToKo(deg) {
  return DIR_KO[Math.round(deg / 22.5) % 16]
}

function fmtCoord(val, pos, neg) {
  return `${val >= 0 ? pos : neg}${Math.abs(val).toFixed(3)}°`
}

export default function Coords({ coords, shipPosition }) {
  const moving  = shipPosition?.moving  ?? false
  const heading = shipPosition?.heading ?? 0
  const knots   = shipPosition?.knots   ?? 0

  return (
    <div className={styles.coords}>
      {/* 선박 현재 좌표 */}
      <div className={styles.shipRow}>
        <span className={styles.shipLabel}>선박</span>
        {shipPosition ? (
          <>
            <span className={styles.shipVal}>{fmtCoord(shipPosition.lat, 'N', 'S')}</span>
            <span className={styles.sep}>/</span>
            <span className={styles.shipVal}>{fmtCoord(shipPosition.lon, 'E', 'W')}</span>
          </>
        ) : (
          <span className={styles.dash}>— / —</span>
        )}
      </div>

      {/* 방향 + 속도 */}
      <div className={styles.statusRow}>
        <span className={styles.statusIcon}
          style={{ transform: `rotate(${heading}deg)`, opacity: moving ? 1 : 0.3 }}>
          ↑
        </span>
        <span className={styles.statusDir}>{headingToKo(heading)}</span>
        <span className={styles.statusDeg}>{heading.toFixed(0)}°</span>
        <span className={styles.statusSep}>·</span>
        <span className={`${styles.statusSpeed} ${moving ? styles.moving : styles.stopped}`}>
          {moving ? `${knots} 노트` : '정박'}
        </span>
      </div>

      {/* 마우스 커서 좌표 */}
      <div className={styles.cursorRow}>
        <span className={styles.cursorLabel}>커서</span>
        {coords ? (
          <span className={styles.cursorVal}>
            {fmtCoord(parseFloat(coords.lat), 'N', 'S')} / {fmtCoord(parseFloat(coords.lon), 'E', 'W')}
          </span>
        ) : (
          <span className={styles.dash}>— / —</span>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { feature } from 'topojson-client'
import { geoContains } from 'd3-geo'
import { WAYPOINTS } from '../data/waypoints'
import { COLOR, MAPBOX_TOKEN } from '../constants/colors'

// ── 선박 상공(탑뷰) 아이콘 Canvas 생성 ──────────────────
function makeShipCanvas() {
  const W = 56, H = 128
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const cx = W / 2

  ctx.shadowColor = '#44aadd'
  ctx.shadowBlur  = 18

  // 선체
  ctx.beginPath()
  ctx.moveTo(cx, 4)
  ctx.bezierCurveTo(cx + 20, 14, cx + 22, 32, cx + 22, 62)
  ctx.lineTo(cx + 20, 108)
  ctx.bezierCurveTo(cx + 12, 118, cx, 122, cx, 122)
  ctx.bezierCurveTo(cx - 12, 118, cx - 20, 108, cx - 20, 108)
  ctx.lineTo(cx - 22, 62)
  ctx.bezierCurveTo(cx - 22, 32, cx - 20, 14, cx, 4)
  ctx.closePath()
  ctx.fillStyle = '#192838'
  ctx.fill()
  ctx.shadowBlur  = 0
  ctx.strokeStyle = '#4499cc'
  ctx.lineWidth   = 1.5
  ctx.stroke()

  // LNG 탱크 5개 (탑뷰 원형)
  ;[20, 40, 60, 80, 100].forEach(ty => {
    ctx.beginPath()
    ctx.arc(cx, ty, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#ccd8e0'
    ctx.fill()
    ctx.strokeStyle = '#7a8fa0'
    ctx.lineWidth   = 0.8
    ctx.stroke()
    // 하이라이트
    ctx.beginPath()
    ctx.arc(cx - 2, ty - 2, 4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.fill()
  })

  // 선수 표시 (빨간 점)
  ctx.beginPath()
  ctx.arc(cx, 6, 3.5, 0, Math.PI * 2)
  ctx.fillStyle   = '#ff4422'
  ctx.shadowColor = '#ff4422'
  ctx.shadowBlur  = 8
  ctx.fill()
  ctx.shadowBlur  = 0

  // 선교
  ctx.fillStyle = '#dde8f0'
  ctx.beginPath()
  ctx.roundRect(cx - 9, 110, 18, 10, 3)
  ctx.fill()

  return canvas
}

// ── 방위각 계산 (북쪽=0, 시계방향 도(°)) ────────────────
function calcBearingDeg(lon1, lat1, lon2, lat2) {
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const y   = Math.sin(Δλ) * Math.cos(φ2)
  const x   = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ── Globe 컴포넌트 ────────────────────────────────────────
export default function Globe({ onCoordsChange, onShipMove, onLandWarning }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const landRef      = useRef(null)

  // 콜백 ref (map.on('load') 내부 클로저에서 최신 함수 참조 유지)
  const coordsCbRef   = useRef(onCoordsChange)
  const shipMoveCbRef = useRef(onShipMove)
  const landWarnCbRef = useRef(onLandWarning)
  useEffect(() => { coordsCbRef.current   = onCoordsChange }, [onCoordsChange])
  useEffect(() => { shipMoveCbRef.current = onShipMove     }, [onShipMove])
  useEffect(() => { landWarnCbRef.current = onLandWarning  }, [onLandWarning])

  // 육지 데이터 로드
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => { landRef.current = feature(world, world.objects.land) })
      .catch(() => {})
  }, [])

  // Mapbox 초기화 (한 번만)
  useEffect(() => {
    if (mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      'mapbox://styles/mapbox/streets-v12',
      center:     [130, 30],
      zoom:       2.8,
      projection: { name: 'globe' },
      antialias:  true,
    })
    mapRef.current = map

    // 선박 상태 (ref 불필요 - Mapbox 루프 클로저에서만 접근)
    const ship   = { lon: 130, lat: 30 }
    const target = { lon: 130, lat: 30 }
    let   heading = 0
    const wake    = [[130, 30]]
    let   rafId

    map.on('load', () => {
      // ── 대기 + 우주 (스크린샷처럼 흰 대기광) ────────────
      map.setFog({
        color:            'rgb(255, 255, 255)',     // 지평선 흰 빛
        'high-color':     'rgb(180, 215, 255)',     // 상단 하늘색
        'horizon-blend':  0.08,
        'space-color':    'rgb(8, 11, 26)',         // 우주 어두운 남색
        'star-intensity': 0.80,
      })

      // ── 선박 아이콘 등록 (ImageData로 변환 → v3 호환) ───
      const shipCanvas = makeShipCanvas()
      const shipCtx    = shipCanvas.getContext('2d')
      const imgData    = shipCtx.getImageData(0, 0, shipCanvas.width, shipCanvas.height)
      map.addImage('ship-icon', {
        width:  shipCanvas.width,
        height: shipCanvas.height,
        data:   imgData.data,
      })

      // ── 소스 등록 ────────────────────────────────────────
      map.addSource('ship', {
        type: 'geojson',
        data: {
          type:       'Feature',
          geometry:   { type: 'Point', coordinates: [ship.lon, ship.lat] },
          properties: { bearing: 0 },
        },
      })

      map.addSource('wake', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // ── 항적 레이어: 크기·투명도 페이드 원형 점 ──────────
      map.addLayer({
        id:     'wake-dots',
        type:   'circle',
        source: 'wake',
        paint: {
          // age: 0=가장 오래됨 → 1=가장 최신
          'circle-radius':  ['interpolate', ['linear'], ['get', 'age'], 0, 1.5, 1, 5.5],
          'circle-color':   '#FF6600',
          'circle-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 0.06, 1, 0.72],
          'circle-blur':    ['interpolate', ['linear'], ['get', 'age'], 0, 1.0,  1, 0.15],
        },
      })

      // ── 선박 심볼 레이어 ──────────────────────────────────
      map.addLayer({
        id:     'ship-layer',
        type:   'symbol',
        source: 'ship',
        layout: {
          'icon-image':              'ship-icon',
          'icon-size': ['interpolate', ['linear'], ['zoom'],
            1, 0.18,
            4, 0.42,
            8, 0.72,
          ],
          'icon-rotate':              ['get', 'bearing'],
          'icon-rotation-alignment': 'map',      // 지도 기준 회전 (북쪽=0)
          'icon-pitch-alignment':    'viewport',  // 화면 정면 유지
          'icon-allow-overlap':       true,
          'icon-ignore-placement':    true,
        },
      })

      // ── 해로 웨이포인트 마커 (항상 라벨 표시) ───────────
      WAYPOINTS.forEach(wp => {
        // 마커 컨테이너
        const el = document.createElement('div')
        el.style.cssText = `
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; cursor: pointer; pointer-events: auto;
        `

        // 글로우 도트
        const dot = document.createElement('div')
        dot.className = 'wp-marker'
        dot.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: ${COLOR[wp.type].hex};
          box-shadow:
            0 0 0 3px ${COLOR[wp.type].hex}55,
            0 0 10px ${COLOR[wp.type].hex}bb,
            0 0 20px ${COLOR[wp.type].hex}44;
        `

        // 한국어 라벨 (항상 표시)
        const label = document.createElement('div')
        label.textContent = wp.name_ko
        label.style.cssText = `
          font-size: 11px; font-weight: 700; white-space: nowrap;
          color: ${COLOR[wp.type].hex};
          text-shadow:
            0 1px 4px rgba(255,255,255,0.9),
            0 1px 4px rgba(255,255,255,0.9),
            0 0 8px rgba(255,255,255,0.8);
          font-family: Inter, 'Noto Sans KR', sans-serif;
          letter-spacing: 0.02em;
        `

        el.appendChild(dot)
        el.appendChild(label)

        // 클릭 시 팝업 (영문명 + 좌표)
        const popup = new mapboxgl.Popup({
          offset:      20,
          closeButton: false,
          className:   'wp-popup',
        }).setHTML(`
          <div style="
            background:rgba(8,14,24,0.95);
            border:1px solid ${COLOR[wp.type].hex}55;
            border-radius:9px; padding:9px 14px;
            font-family:Inter,'Noto Sans KR',sans-serif;
          ">
            <div style="color:${COLOR[wp.type].hex};font-weight:700;font-size:13px;">
              ${wp.name_ko}
            </div>
            <div style="color:rgba(180,210,240,0.65);font-size:11px;margin-top:3px;">
              ${wp.name}
            </div>
            <div style="color:rgba(140,170,200,0.45);font-size:10px;margin-top:4px;">
              ${wp.lat.toFixed(2)}°, ${wp.lon.toFixed(2)}°
            </div>
          </div>
        `)

        new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([wp.lon, wp.lat])
          .setPopup(popup)
          .addTo(map)
      })

      // ── 마우스 이동: 육지 감지 + 선박 목표 갱신 ─────────
      map.on('mousemove', e => {
        const { lng, lat } = e.lngLat
        const isLand = landRef.current
          ? geoContains(landRef.current, [lng, lat])
          : false

        if (isLand) {
          landWarnCbRef.current?.(true)
        } else {
          target.lon = lng
          target.lat = lat
          landWarnCbRef.current?.(false)
        }
        coordsCbRef.current?.({ lat: lat.toFixed(3), lon: lng.toFixed(3) })
      })

      map.on('mouseleave', () => {
        landWarnCbRef.current?.(false)
        coordsCbRef.current?.(null)
      })

      // ── LNG 속도 상수 (17.5 knots, 시뮬레이션 스케일 ×25000) ──
      // 17.5 knot × 1852 m/knot ÷ 3600 s ÷ 111320 m/deg ÷ 60fps × 25000
      const MAX_DEG_PER_FRAME = 17.5 * 1852 / (3600 * 111320 * 60) * 25000 // ≈ 0.034 deg/frame

      // ── 애니메이션 루프: LNG 속도 기반 이동 ─────────────
      function animate() {
        rafId = requestAnimationFrame(animate)

        const prevLon = ship.lon
        const prevLat = ship.lat

        // 위도에 따른 경도 보정 (등거리 이동)
        const cosLat  = Math.cos(ship.lat * Math.PI / 180)
        const dLon    = target.lon - ship.lon
        const dLat    = target.lat - ship.lat
        const distDeg = Math.sqrt((dLon * cosLat) ** 2 + dLat ** 2)

        let nextLon, nextLat
        if (distDeg < 1e-6) {
          nextLon = ship.lon
          nextLat = ship.lat
        } else if (distDeg <= MAX_DEG_PER_FRAME) {
          nextLon = target.lon
          nextLat = target.lat
        } else {
          const scale = MAX_DEG_PER_FRAME / distDeg
          nextLon = ship.lon + dLon * scale
          nextLat = ship.lat + dLat * scale
        }

        // 새 위치가 육지이면 이동하지 않음
        const nextOnLand = landRef.current
          ? geoContains(landRef.current, [nextLon, nextLat])
          : false

        if (!nextOnLand) {
          ship.lon = nextLon
          ship.lat = nextLat
        }

        const moveLon = ship.lon - prevLon
        const moveLat = ship.lat - prevLat

        if (Math.abs(moveLon) > 1e-9 || Math.abs(moveLat) > 1e-9) {
          heading = calcBearingDeg(prevLon, prevLat, ship.lon, ship.lat)

          wake.push([ship.lon, ship.lat])
          if (wake.length > 60) wake.shift()

          shipMoveCbRef.current?.(heading * Math.PI / 180)
        }

        // GeoJSON 소스 실시간 갱신
        map.getSource('ship')?.setData({
          type:       'Feature',
          geometry:   { type: 'Point', coordinates: [ship.lon, ship.lat] },
          properties: { bearing: heading },
        })

        if (wake.length >= 1) {
          map.getSource('wake')?.setData({
            type: 'FeatureCollection',
            features: wake.map((coord, i) => ({
              type:       'Feature',
              geometry:   { type: 'Point', coordinates: coord },
              properties: { age: (i + 1) / wake.length },
            })),
          })
        }
      }
      animate()
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // 의존성 없음 - 한 번만 실행, 콜백은 ref로 참조

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}

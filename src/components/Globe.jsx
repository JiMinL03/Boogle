import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { WAYPOINTS } from '../data/waypoints'
import { ROUTES }    from '../data/routes'

// routes.js 좌표 [lon, lat] → {lon, lat} 변환 (reversed=true면 경로 뒤집기)
function routeWaypoints(routeId, reversed = false) {
  const route = ROUTES.find(r => r.id === routeId)
  if (!route) return null
  const coords = reversed ? [...route.coords].reverse() : route.coords
  return coords.map(([lon, lat]) => ({ lon, lat }))
}
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
export default function Globe({ onCoordsChange, onLandWarning, onShipPosition, routeId, reversed, isRunning }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  // 자동 항행 웨이포인트 큐 (외부에서 설정 → animate 루프에서 소비)
  const autoRouteRef  = useRef(null) // { waypoints: [{lon,lat},...], wpIdx: 0 }
  const shipResetRef  = useRef(null) // { lon, lat } — 설정되면 다음 프레임에서 선박 위치 초기화
  const routeIdRef    = useRef(routeId)   // 최신 routeId를 load 클로저에서 참조
  const reversedRef   = useRef(reversed)  // 최신 reversed 상태
  const isRunningRef  = useRef(isRunning) // 최신 isRunning을 animate 클로저에서 참조

  // 콜백 ref (map.on('load') 내부 클로저에서 최신 함수 참조 유지)
  const coordsCbRef   = useRef(onCoordsChange)
  const landWarnCbRef = useRef(onLandWarning)
  const shipPosCbRef  = useRef(onShipPosition)
  useEffect(() => { coordsCbRef.current   = onCoordsChange  }, [onCoordsChange])
  useEffect(() => { landWarnCbRef.current = onLandWarning   }, [onLandWarning])
  useEffect(() => { shipPosCbRef.current  = onShipPosition  }, [onShipPosition])
  useEffect(() => { isRunningRef.current  = isRunning       }, [isRunning])

  // routeId 또는 reversed 변경 → 자동 항행 설정 + 선박 위치 초기화 + 해당 항로 레이어 표시
  useEffect(() => {
    routeIdRef.current  = routeId
    reversedRef.current = reversed

    const wps = routeWaypoints(routeId, reversed)
    if (!wps || wps.length < 2) { autoRouteRef.current = null; return }

    autoRouteRef.current = { waypoints: wps, wpIdx: 0 }
    // 선박을 경로 시작점으로 리셋 (reversed=true면 원래 경로의 마지막 좌표)
    shipResetRef.current = { lon: wps[0].lon, lat: wps[0].lat }

    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    ROUTES.forEach(r => {
      map.setLayoutProperty(`route-${r.id}`, 'visibility', r.id === routeId ? 'visible' : 'none')
    })
  }, [routeId, reversed])

  // Mapbox 초기화 (한 번만)
  useEffect(() => {
    if (mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      'mapbox://styles/mapbox/dark-v11',
      center:     [130, 30],
      zoom:       2.8,
      projection: { name: 'mercator' },
      antialias:  true,
    })
    mapRef.current = map

    // 선박 상태
    const ship   = { lon: 126.945, lat: 36.916 } // 평택 LNG 터미널 출발
    const target = { lon: 126.945, lat: 36.916 }
    let   heading = 0
    const wake    = [[126.945, 36.916]]
    let   rafId
    let   middleDown = false

    map.on('style.load', () => {
      map.setConfigProperty('basemap', 'lightPreset', 'night')
    })

    map.on('load', () => {
      // ── 선박 아이콘 등록 (ImageData로 변환 → v3 호환) ───
      const shipCanvas = makeShipCanvas()
      const shipCtx    = shipCanvas.getContext('2d')
      const imgData    = shipCtx.getImageData(0, 0, shipCanvas.width, shipCanvas.height)
      map.addImage('ship-icon', {
        width:  shipCanvas.width,
        height: shipCanvas.height,
        data:   imgData.data,
      })

      // ── 항로 레이어 (선박·항적 아래에 렌더링) ────────────
      ROUTES.forEach(route => {
        map.addSource(`route-${route.id}`, {
          type: 'geojson',
          data: {
            type:     'Feature',
            geometry: { type: 'LineString', coordinates: route.coords },
            properties: {},
          },
        })
        map.addLayer({
          id:     `route-${route.id}`,
          type:   'line',
          source: `route-${route.id}`,
          slot:   'top',
          layout: {
            'line-cap':   'round',
            'line-join':  'round',
            'visibility': route.id === routeIdRef.current ? 'visible' : 'none',
          },
          paint: {
            'line-color':   route.color,
            'line-width':   ['interpolate', ['linear'], ['zoom'], 1, 1.5, 4, 2.5, 8, 4],
            'line-opacity': 0.9,
          },
        })
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
        type:        'geojson',
        lineMetrics: true,
        data: {
          type:       'Feature',
          geometry:   { type: 'LineString', coordinates: [[126.945, 36.916], [126.945, 36.916]] },
          properties: {},
        },
      })

      // ── 항적 레이어: 둥근 선형 그라데이션 ─────────────────
      map.addLayer({
        id:     'wake-line',
        type:   'line',
        source: 'wake',
        slot:   'top',
        layout: {
          'line-cap':  'round',
          'line-join': 'round',
        },
        paint: {
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 4, 5.5, 8, 10],
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0,    'rgba(255, 102, 0, 0.0)',
            0.25, 'rgba(255, 102, 0, 0.15)',
            0.6,  'rgba(255, 102, 0, 0.55)',
            1.0,  'rgba(255, 102, 0, 0.90)',
          ],
        },
      })

      // ── 선박 심볼 레이어 ──────────────────────────────────
      map.addLayer({
        id:     'ship-layer',
        type:   'symbol',
        source: 'ship',
        slot:   'top',
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

      // ── 중간 휠 버튼: 잠금 해제/잠금 ──────────────────────
      map.on('mousedown', e => {
        if (e.originalEvent.button === 1) {
          e.originalEvent.preventDefault()
          middleDown = true
        }
      })

      map.on('mouseup', e => {
        if (e.originalEvent.button === 1) {
          middleDown = false
          target.lon = ship.lon
          target.lat = ship.lat
        }
      })

      // ── 마우스 이동: 육지 감지 + 선박 목표 갱신 ─────────
      map.on('mousemove', e => {
        const { lng, lat } = e.lngLat
        if (middleDown) {
          target.lon = lng
          target.lat = lat
        }
        coordsCbRef.current?.({ lat: lat.toFixed(3), lon: lng.toFixed(3) })
      })

      map.on('mouseleave', () => {
        middleDown = false
        target.lon = ship.lon
        target.lat = ship.lat
        landWarnCbRef.current?.(false)
        coordsCbRef.current?.(null)
      })

      // ── 선박 속도 상수 (16 knots) ──────────────────────────
      // 1 knot = 1 해리/h = 1852 m/h
      // TIME_SCALE: 줌 레벨에 따라 동적으로 결정 (줌아웃=빠름, 줌인=느림)
      const SHIP_KNOTS    = 16
      const SPEED_MS      = SHIP_KNOTS * 1852 / 3600  // ≈ 8.231 m/s
      const M_PER_DEG_LAT = 111320                    // 위도 1° = 111,320 m (고정)
      // 줌 ≤5 → 1000배속, 줌 ≥15 → 1배속, 사이는 로그 보간
      function getTimeScale() {
        const zoom = map.getZoom()
        const ZOOM_MIN = 5, ZOOM_MAX = 15
        const SCALE_MIN = 1, SCALE_MAX = 1
        const t = Math.max(0, Math.min(1, (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)))
        // 로그 보간: 시각적으로 자연스러운 배속 변화
        return SCALE_MAX * Math.pow(SCALE_MIN / SCALE_MAX, t)
      }
      let lastTime     = performance.now()
      let lastMoveTime = Date.now()
      let wakeOpacity  = 0
      let shipPosFrame = 0
      let isMoving     = false

      // ── 애니메이션 루프: 실거리(m) 기반 이동 ─────────────
      function animate() {
        rafId = requestAnimationFrame(animate)

        // 선박 위치 리셋 요청 처리 (경로 변경 / 방향 전환 시)
        if (shipResetRef.current) {
          const { lon, lat } = shipResetRef.current
          ship.lon   = lon
          ship.lat   = lat
          target.lon = lon
          target.lat = lat
          wake.length = 0
          wake.push([lon, lat])
          shipResetRef.current = null
        }

        // deltaTime: 프레임 간 경과 시간(초), 최대 0.1s 클램프(탭 복귀 등 대비)
        const now        = performance.now()
        const deltaTime  = Math.min((now - lastTime) / 1000, 0.1)
        lastTime         = now
        // 이 프레임에서 이동 가능한 거리(m) = 실제속도 × 동적시간압축 × 프레임시간
        const stepMeters = SPEED_MS * getTimeScale() * deltaTime

        if (isRunningRef.current) {
          // 자동 항행: 현재 목표 웨이포인트로 target 갱신
          const ar = autoRouteRef.current
          if (ar && ar.wpIdx < ar.waypoints.length) {
            const wp = ar.waypoints[ar.wpIdx]
            target.lon = wp.lon
            target.lat = wp.lat
          }

          const prevLon = ship.lon
          const prevLat = ship.lat

          // 위도에서 경도 1° 의 실제 거리(m)
          const mPerDegLon = M_PER_DEG_LAT * Math.cos(ship.lat * Math.PI / 180)

          // 목표까지의 벡터를 미터 단위로 변환
          const dLon   = target.lon - ship.lon
          const dLat   = target.lat - ship.lat
          const dLon_m = dLon * mPerDegLon
          const dLat_m = dLat * M_PER_DEG_LAT
          const distM  = Math.sqrt(dLon_m ** 2 + dLat_m ** 2)

          let nextLon, nextLat
          if (distM < 1) {
            nextLon = ship.lon
            nextLat = ship.lat
          } else if (distM <= stepMeters) {
            nextLon = target.lon
            nextLat = target.lat
          } else {
            const scale = stepMeters / distM
            nextLon = ship.lon + (dLon_m * scale) / mPerDegLon
            nextLat = ship.lat + (dLat_m * scale) / M_PER_DEG_LAT
          }

          ship.lon = nextLon
          ship.lat = nextLat

          // 자동 항행: 현재 waypoint 도달 시 다음으로 진행
          const ar2 = autoRouteRef.current
          if (ar2 && ar2.wpIdx < ar2.waypoints.length) {
            const wp       = ar2.waypoints[ar2.wpIdx]
            const mPerDLon = M_PER_DEG_LAT * Math.cos(ship.lat * Math.PI / 180)
            const dWpLon_m = (wp.lon - ship.lon) * mPerDLon
            const dWpLat_m = (wp.lat - ship.lat) * M_PER_DEG_LAT
            const wpDistM  = Math.sqrt(dWpLon_m ** 2 + dWpLat_m ** 2)
            if (wpDistM < stepMeters * 2) {
              ar2.wpIdx++
            }
          }

          const moveLon = ship.lon - prevLon
          const moveLat = ship.lat - prevLat

          if (Math.abs(moveLon) > 1e-9 || Math.abs(moveLat) > 1e-9) {
            heading  = calcBearingDeg(prevLon, prevLat, ship.lon, ship.lat)
            isMoving = true
            wake.push([ship.lon, ship.lat])
            if (wake.length > 200) wake.shift()
            lastMoveTime = Date.now()
            wakeOpacity  = 1
          } else {
            isMoving = false
            const elapsed = Date.now() - lastMoveTime
            if (elapsed > 1500) {
              wakeOpacity = Math.max(0, 1 - (elapsed - 1500) / 3000)
              if (wakeOpacity === 0 && wake.length > 1) {
                wake.length = 0
                wake.push([ship.lon, ship.lat])
              }
            }
          }
        } else {
          // 정지 중: 항적 서서히 사라짐
          isMoving = false
          const elapsed = Date.now() - lastMoveTime
          if (elapsed > 1500) {
            wakeOpacity = Math.max(0, 1 - (elapsed - 1500) / 3000)
            if (wakeOpacity === 0 && wake.length > 1) {
              wake.length = 0
              wake.push([ship.lon, ship.lat])
            }
          }
        }
        map.setPaintProperty('wake-line', 'line-opacity', wakeOpacity)

        // 선박 위치 6프레임마다 외부로 전송 (isRunning 중에만)
        if (isRunningRef.current) {
          shipPosFrame++
          if (shipPosFrame >= 6) {
            shipPosFrame = 0
            shipPosCbRef.current?.({
              lat:     ship.lat,
              lon:     ship.lon,
              heading,
              moving:  isMoving,
              knots:   SHIP_KNOTS,
            })
          }
        }

        // GeoJSON 소스 실시간 갱신
        map.getSource('ship')?.setData({
          type:       'Feature',
          geometry:   { type: 'Point', coordinates: [ship.lon, ship.lat] },
          properties: { bearing: heading },
        })

        const coords = wake.length >= 2 ? wake : [[ship.lon, ship.lat], [ship.lon, ship.lat]]
        if (wake.length >= 1) {
          map.getSource('wake')?.setData({
            type:       'Feature',
            geometry:   { type: 'LineString', coordinates: coords },
            properties: {},
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

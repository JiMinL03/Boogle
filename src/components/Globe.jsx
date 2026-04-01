import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { WAYPOINTS } from '../data/waypoints'
import { COLOR, CESIUM_TOKEN } from '../constants/colors'

function makeIcon(type) {
  const S = 128
  const cx = S / 2
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const [r, g, b] = COLOR[type].rgb
  const hex = COLOR[type].hex

  ctx.shadowColor = hex
  ctx.shadowBlur = 28
  ctx.beginPath()
  ctx.arc(cx, cx, 46, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`
  ctx.lineWidth = 6
  ctx.stroke()

  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.arc(cx, cx, 30, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(cx, cx, 18, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${r},${g},${b},0.30)`
  ctx.fill()

  ctx.shadowBlur = 16
  ctx.beginPath()
  ctx.arc(cx, cx, 12, 0, Math.PI * 2)
  ctx.fillStyle = hex
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(cx, cx, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fill()

  return canvas.toDataURL()
}

export default function Globe({ onCoordsChange }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    if (viewerRef.current) return // strict mode 이중 실행 방지

    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyAtmosphere: new Cesium.SkyAtmosphere(),
    })
    viewerRef.current = viewer

    // 시계 애니메이션 정지 (조명 자동 회전 방지)
    viewer.clock.shouldAnimate = false

    // 조작 매핑
    const ctrl = viewer.scene.screenSpaceCameraController
    ctrl.rotateEventTypes    = Cesium.CameraEventType.LEFT_DRAG
    ctrl.translateEventTypes = Cesium.CameraEventType.RIGHT_DRAG
    ctrl.tiltEventTypes      = [
      Cesium.CameraEventType.MIDDLE_DRAG,
      { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
    ]
    ctrl.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH]

    // 지구 스타일
    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#020C16')
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#111114')
    viewer.scene.fog.enabled = true
    viewer.scene.fog.density = 0.00015

    // 초기 카메라
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(50, 20, 18000000),
      orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
    })

    // 마커 아이콘
    const icons = {
      canal:  makeIcon('canal'),
      strait: makeIcon('strait'),
      cape:   makeIcon('cape'),
    }

    // 마커 추가
    WAYPOINTS.forEach((wp, i) => {
      const col = Cesium.Color.fromCssColorString(COLOR[wp.type].hex)
      const phase = (i / WAYPOINTS.length) * Math.PI * 2

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat),
        billboard: {
          image: icons[wp.type],
          width: 56,
          height: 56,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: new Cesium.CallbackProperty(
            () => 0.85 + 0.15 * Math.sin(Date.now() * 0.002 + phase),
            false
          ),
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 2e7, 0.65),
        },
        label: {
          text: wp.name_ko,
          font: 'bold 13px Inter, Noto Sans KR, sans-serif',
          fillColor: col,
          outlineColor: Cesium.Color.fromCssColorString('#0a0a0d'),
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -34),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.1, 2e7, 0.7),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(10,10,13,0.82)'),
          backgroundPadding: new Cesium.Cartesian2(8, 5),
        },
      })
    })

    // 마우스 좌표 추적
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(e => {
      const cart = viewer.camera.pickEllipsoid(e.endPosition)
      if (cart) {
        const carto = Cesium.Cartographic.fromCartesian(cart)
        const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(2)
        const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(2)
        onCoordsChange({ lat, lon })
      } else {
        onCoordsChange(null)
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [onCoordsChange])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import styles from './ShipPanel3D.module.css'

export default function ShipPanel3D({ heading = 0 }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({ theta: 0.48, phi: 0.60, radius: 24, heading: 0 })

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFShadowMap
    renderer.setClearColor(0x07111c, 1)

    const scene  = new THREE.Scene()
    scene.fog    = new THREE.FogExp2(0x07111c, 0.018)
    const camera = new THREE.PerspectiveCamera(42, 2, 0.05, 200)

    scene.add(new THREE.AmbientLight(0x8aaabb, 0.6))
    const sun = new THREE.DirectionalLight(0xfff6e0, 2.4)
    sun.position.set(8, 14, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left   = -22; sun.shadow.camera.right = 22
    sun.shadow.camera.top    = 12;  sun.shadow.camera.bottom = -12
    sun.shadow.bias = -0.001
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x4488bb, 0.55)
    rim.position.set(-5, 3, -8); scene.add(rim)

    const mHullDark = new THREE.MeshStandardMaterial({ color: 0x192838, metalness: 0.55, roughness: 0.45 })
    const mHullRed  = new THREE.MeshStandardMaterial({ color: 0xaa1a1a, metalness: 0.2,  roughness: 0.7  })
    const mDeck     = new THREE.MeshStandardMaterial({ color: 0xccd8e0, metalness: 0.25, roughness: 0.55 })
    const mHatch    = new THREE.MeshStandardMaterial({ color: 0xb8c8d2, metalness: 0.3,  roughness: 0.6  })
    const mHatchRib = new THREE.MeshStandardMaterial({ color: 0x8899a8, metalness: 0.4,  roughness: 0.55 })
    const mWhite    = new THREE.MeshStandardMaterial({ color: 0xedf2f6, metalness: 0.15, roughness: 0.5  })
    const mGray     = new THREE.MeshStandardMaterial({ color: 0x6a7a88, metalness: 0.35, roughness: 0.6  })
    const mDkGray   = new THREE.MeshStandardMaterial({ color: 0x28383f, metalness: 0.45, roughness: 0.55 })
    const mYellow   = new THREE.MeshStandardMaterial({ color: 0xcc9900, metalness: 0.3,  roughness: 0.5  })
    const mPipe     = new THREE.MeshStandardMaterial({ color: 0xaabbc8, metalness: 0.72, roughness: 0.28 })
    const mValve    = new THREE.MeshStandardMaterial({ color: 0x3d7799, metalness: 0.65, roughness: 0.3  })
    const mBlack    = new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.6,  roughness: 0.4  })
    const mRail     = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4,  roughness: 0.45 })
    const mOrange   = new THREE.MeshStandardMaterial({ color: 0xcc4400, metalness: 0.2,  roughness: 0.7  })

    function add(geo, mat, x, y, z) {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, y, z)
      m.castShadow = true; m.receiveShadow = true
      scene.add(m); return m
    }
    const B  = (w, h, d)       => new THREE.BoxGeometry(w, h, d)
    const CY = (a, b, h, s=12) => new THREE.CylinderGeometry(a, b, h, s)
    const SP = (r, s=20, t=14) => new THREE.SphereGeometry(r, s, t)

    const HL = 20, HW = 2.0
    add(B(HL, 1.20, HW), mHullDark, 0, 0.60, 0)
    add(B(HL, 0.50, HW), mHullRed,  0, -0.25, 0)
    add(B(HL, 0.06, HW + 0.02), mHullRed, 0, 0.24, 0)

    ;(() => {
      const g = new THREE.BufferGeometry()
      const v = new Float32Array([
        10.0, 1.20, 1.01,  10.0, 1.20,-1.01,
        10.0,-0.30, 1.01,  10.0,-0.30,-1.01,
        11.6, 0.45, 0,     11.6,-0.10, 0,
        12.0, 0.15, 0,
      ])
      const idx = new Uint16Array([
        0,2,4, 2,5,4, 5,3,4, 3,1,4,
        0,4,1, 4,5,6, 5,3,6, 3,1,6, 1,0,6, 0,4,6,
      ])
      g.setAttribute('position', new THREE.BufferAttribute(v, 3))
      g.setIndex(new THREE.BufferAttribute(idx, 1))
      g.computeVertexNormals()
      const m = new THREE.Mesh(g, mHullDark); m.castShadow = true; scene.add(m)
    })()
    add(SP(0.28, 10, 8), mHullRed, 11.65, -0.52, 0)

    add(B(0.60, 1.20, HW), mHullDark, -10.30, 0.60, 0)
    add(B(0.40, 1.20, 1.80), mHullDark, -10.55, 0.60, 0)
    add(B(0.20, 0.80, 1.40), mHullDark, -10.70, 0.40, 0)
    add(B(HL + 0.2, 0.14, HW + 0.02), mDeck, 0, 1.27, 0)

    const hatchCenters = [8.0, 4.25, 0.5, -3.25, -7.0]
    hatchCenters.forEach(hx => {
      add(B(3.20, 0.12, 1.80), mHatch,    hx, 1.34, 0)
      for (let r = 0; r < 5; r++)
        add(B(3.20, 0.06, 0.04), mHatchRib, hx, 1.41, -0.88 + r * 0.44)
      for (let c = 0; c < 7; c++)
        add(B(0.04, 0.08, 1.80), mHatchRib, hx - 1.44 + c * 0.48, 1.38, 0)
      add(B(3.22, 0.06, 0.05), mHatchRib, hx, 1.38,  0.91)
      add(B(3.22, 0.06, 0.05), mHatchRib, hx, 1.38, -0.91)
      add(B(0.05, 0.06, 1.80), mHatchRib, hx + 1.61, 1.38, 0)
      add(B(0.05, 0.06, 1.80), mHatchRib, hx - 1.61, 1.38, 0)
    })

    for (let i = 0; i < 4; i++) {
      const cx = hatchCenters[i] - (hatchCenters[i] - hatchCenters[i + 1]) / 2
      add(B(0.50, 0.10, 1.80), mDkGray, cx, 1.32, 0)
    }

    ;[-0.62, 0, 0.62].forEach(pz => {
      const pg = new THREE.CylinderGeometry(0.058, 0.058, HL * 0.95, 8)
      const pm = new THREE.Mesh(pg, mPipe)
      pm.rotation.z = Math.PI / 2; pm.position.set(-0.3, 1.38, pz)
      pm.castShadow = true; scene.add(pm)
      for (let s = 0; s < 12; s++) {
        const sx = -8.5 + s * 1.55
        add(CY(0.04, 0.04, 0.18, 6), mGray, sx, 1.30, pz)
        if (s % 3 === 1) add(SP(0.075, 8, 6), mValve, sx, 1.46, pz)
      }
    })
    for (let v = 0; v < 8; v++) {
      const vx = -7 + v * 2.0
      const pm = new THREE.Mesh(CY(0.04, 0.04, 0.30, 6), mPipe)
      pm.position.set(vx, 1.30, 0); scene.add(pm)
      add(B(0.20, 0.08, 0.65), mGray, vx, 1.36, 0)
    }

    ;[7.5, 1.0, -4.5].forEach(cx => {
      add(B(0.14, 1.40, 0.14), mYellow, cx, 2.05,  0.82)
      add(B(0.14, 1.40, 0.14), mYellow, cx, 2.05, -0.82)
      add(B(0.14, 0.14, 1.65), mYellow, cx, 2.74, 0)
      const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.30, 6), mBlack)
      hm.rotation.z = Math.PI / 2; hm.position.set(cx, 2.74, 0); scene.add(hm)
      add(CY(0.035, 0.035, 0.50, 6), mGray, cx, 3.40, 0)
    })

    add(B(0.36, 0.24, 1.95), mDkGray, 0.0, 1.38, 0)
    add(B(0.70, 0.32, 0.28), mGray,   0.0, 1.54,  0.75)
    add(B(0.70, 0.32, 0.28), mGray,   0.0, 1.54, -0.75)
    add(CY(0.065, 0.065, 0.55, 8), mOrange, 0.0, 1.82,  0.75)
    add(CY(0.065, 0.065, 0.55, 8), mOrange, 0.0, 1.82, -0.75)

    add(B(HL, 0.04, 0.03), mRail, 0, 1.50,  1.02)
    add(B(HL, 0.04, 0.03), mRail, 0, 1.50, -1.02)
    add(B(HL, 0.04, 0.03), mRail, 0, 1.36,  1.02)
    add(B(HL, 0.04, 0.03), mRail, 0, 1.36, -1.02)
    for (let p = 0; p < 22; p++) {
      add(B(0.03, 0.18, 0.03), mRail, -9.5 + p * 0.95, 1.43,  1.02)
      add(B(0.03, 0.18, 0.03), mRail, -9.5 + p * 0.95, 1.43, -1.02)
    }

    ;[-8.5, -6.5, 6.5, 9.0].forEach(mx => {
      ;[0.72, -0.72].forEach(mz => {
        add(CY(0.19, 0.19, 0.34, 12), mDkGray, mx, 1.34, mz)
        add(SP(0.21, 8, 6), mDkGray, mx, 1.55, mz)
      })
    })

    add(B(0.90, 0.28, 1.60), mWhite, 9.20, 1.32, 0)
    add(CY(0.11, 0.13, 0.32, 10), mDkGray, 9.80, 1.30,  0.60)
    add(CY(0.11, 0.13, 0.32, 10), mDkGray, 9.80, 1.30, -0.60)
    add(CY(0.07, 0.07, 0.45, 8),  mBlack,  9.80, 1.60,  0.60)
    add(CY(0.07, 0.07, 0.45, 8),  mBlack,  9.80, 1.60, -0.60)
    add(B(2.60, 0.50, 1.90), mWhite, 9.0, 1.59, 0)
    add(B(2.40, 0.34, 1.80), mDeck,  9.0, 1.86, 0)
    add(CY(0.04, 0.04, 1.10, 6), mGray, 9.0, 2.38, 0)
    add(B(0.80, 0.07, 0.10), mGray, 9.0, 2.96, 0)
    add(SP(0.09, 8, 6), mValve, 9.0, 2.99, 0)

    const bridgeX = -8.0
    const floors  = [
      { y: 1.22, h: 0.82, w: 3.80, d: 1.95 },
      { y: 2.04, h: 0.76, w: 3.65, d: 1.90 },
      { y: 2.80, h: 0.72, w: 3.50, d: 1.85 },
      { y: 3.52, h: 0.68, w: 3.35, d: 1.80 },
      { y: 4.20, h: 0.64, w: 3.20, d: 1.75 },
      { y: 4.84, h: 0.56, w: 3.00, d: 1.70 },
    ]
    floors.forEach(f => {
      add(B(f.w, f.h, f.d), mWhite, bridgeX, f.y + f.h / 2, 0)
      for (let w = 0; w < 6; w++) {
        const wx = bridgeX - f.w / 2 + 0.28 + w * (f.w - 0.28) / 5.5
        add(B(0.28, 0.22, 0.03), mValve, wx, f.y + f.h * 0.55,  f.d / 2 + 0.02)
        add(B(0.28, 0.22, 0.03), mValve, wx, f.y + f.h * 0.55, -f.d / 2 - 0.02)
      }
      add(B(f.w, 0.045, f.d), mGray, bridgeX, f.y, 0)
    })
    add(CY(0.16, 0.20, 1.80, 8), mBlack, bridgeX - 1.2, 5.90, 0.38)
    add(CY(0.10, 0.16, 0.80, 8), mBlack, bridgeX - 1.2, 6.80, 0.38)
    add(CY(0.035, 0.035, 1.90, 6), mGray,  bridgeX + 0.2, 5.95, 0)
    add(B(1.20, 0.06, 0.10),       mGray,  bridgeX + 0.2, 6.92, 0)
    add(SP(0.09, 8, 6),            mValve, bridgeX + 0.2, 6.99, 0)

    ;(() => {
      const og = new THREE.PlaneGeometry(90, 50, 24, 16)
      const pa = og.attributes.position
      for (let i = 0; i < pa.count; i++) pa.setZ(i, (Math.random() - 0.5) * 0.05)
      og.computeVertexNormals()
      const om = new THREE.MeshStandardMaterial({ color: 0x0d2e48, metalness: 0.08, roughness: 0.55, transparent: true, opacity: 0.90 })
      const o  = new THREE.Mesh(og, om); o.rotation.x = -Math.PI / 2; o.position.y = -0.36; o.receiveShadow = true; scene.add(o)
    })()

    const tgt = new THREE.Vector3(0, 1.8, 0)
    const state = stateRef.current
    function updateCam() {
      camera.position.set(
        tgt.x + state.radius * Math.sin(state.phi) * Math.sin(state.theta),
        tgt.y + state.radius * Math.cos(state.phi),
        tgt.z + state.radius * Math.sin(state.phi) * Math.cos(state.theta),
      )
      camera.lookAt(tgt)
    }
    updateCam()

    function resize() {
      const w = cv.clientWidth, h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    let drag = false, lx = 0, ly = 0
    cv.addEventListener('mousedown', e => { drag = true; lx = e.clientX; ly = e.clientY })
    window.addEventListener('mouseup',  () => { drag = false })
    window.addEventListener('mousemove', e => {
      if (!drag) return
      state.theta -= (e.clientX - lx) * 0.006
      state.phi    = Math.max(0.06, Math.min(Math.PI * 0.87, state.phi - (e.clientY - ly) * 0.006))
      lx = e.clientX; ly = e.clientY; updateCam()
    })
    cv.addEventListener('wheel', e => {
      state.radius = Math.max(5, Math.min(40, state.radius + e.deltaY * 0.025))
      updateCam(); e.preventDefault()
    }, { passive: false })

    let t = 0, animId
    function loop() {
      animId = requestAnimationFrame(loop)
      t += 0.003
      sun.position.set(8 + Math.sin(t * 0.04) * 3, 14, 5)

      // Slowly auto-rotate when not dragged to face heading
      if (!drag) {
        const targetTheta = state.heading + 0.48
        state.theta += (targetTheta - state.theta) * 0.01
        updateCam()
      }
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      renderer.dispose()
    }
  }, [])

  // Sync heading from map to 3D view
  useEffect(() => {
    stateRef.current.heading = heading
  }, [heading])

  return (
    <div className={styles.panel}>
      <div className={styles.label}>LNG Carrier · 266,000 m³</div>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.hint}>드래그 회전 · 스크롤 줌</div>
    </div>
  )
}

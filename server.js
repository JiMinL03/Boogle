import express from 'express'
import cors    from 'cors'

const app  = express()
const PORT = process.env.PORT || 3001

// CORS: Vercel 프론트엔드 허용
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}))

// Express 5에서도 안전하게 raw body 파싱
app.use(express.json({ strict: false }))
app.use(express.urlencoded({ extended: true }))

// 현재 선택된 항로 (메모리 저장)
let savedRoute = { routeId: null, savedAt: null }

// 항로 저장
app.post('/api/route', (req, res) => {
  try {
    const routeId = req.body?.routeId ?? null
    if (!routeId) {
      res.status(400).json({ error: 'routeId 필요' })
      return
    }
    savedRoute = { routeId, savedAt: new Date().toISOString() }
    console.log(`[서버] 항로 저장: ${routeId}`)
    res.json({ ok: true, ...savedRoute })
  } catch (e) {
    console.error('[서버] POST 오류:', e)
    res.status(500).json({ error: e.message })
  }
})

// 저장된 항로 조회
app.get('/api/route', (_req, res) => {
  res.json(savedRoute)
})

app.listen(PORT, () => {
  console.log(`[서버] http://localhost:${PORT} 실행 중`)
})

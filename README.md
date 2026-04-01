# 🚢 BOG TRACK — LNG Boil-Off Gas Optimization Platform

항로·기상·운항 조건 기반 BOG(Boil-Off Gas) 추적 및 최적화 플랫폼

---

## 📁 프로젝트 구조

```
bog-platform/
│
├── frontend/                          # 웹 프론트엔드
│   ├── index.html                     # 메인 대시보드 (Cesium 3D 지도 + 패널)
│   ├── public/
│   │   └── models/
│   │       └── lng_vessel.glb         # 🔷 LNG 선박 3D 모델 파일 (직접 준비)
│   └── src/
│       ├── components/
│       │   ├── VesselPanel.js         # 좌측 선박 목록 컴포넌트
│       │   ├── BogGauge.js            # BOG 게이지 위젯
│       │   ├── RouteBar.js            # 하단 항로 바
│       │   └── AlertToast.js          # 알림 토스트
│       ├── hooks/
│       │   ├── useVesselTracker.js    # 선박 위치 실시간 추적
│       │   ├── useWeather.js          # 기상 API 훅
│       │   └── useBogSimulation.js    # BOG 시뮬레이션 훅
│       ├── utils/
│       │   ├── cesiumHelpers.js       # Cesium 유틸 함수
│       │   └── bogFormulas.js         # 프론트엔드 BOG 계산 (경량)
│       └── api/
│           ├── bogApi.js              # BOG 계산 API 호출
│           ├── weatherApi.js          # OpenWeatherMap API
│           └── vesselApi.js           # MarineTraffic API
│
├── backend/                           # Python FastAPI 백엔드
│   ├── main.py                        # API 서버 엔트리포인트
│   ├── requirements.txt               # Python 의존성
│   ├── .env                           # API 키 환경변수 (gitignore!)
│   ├── routers/
│   │   ├── bog.py                     # /api/bog/* 라우터
│   │   ├── weather.py                 # /api/weather/* 라우터
│   │   ├── vessels.py                 # /api/vessels/* 라우터
│   │   └── routes.py                  # /api/route/* 라우터
│   ├── models/
│   │   ├── vessel.py                  # 선박 데이터 모델
│   │   ├── bog_result.py              # BOG 결과 모델
│   │   └── weather.py                 # 기상 데이터 모델
│   ├── services/
│   │   ├── bog_calculator.py          # ⭐ BOG 계산 엔진 (핵심)
│   │   ├── weather_service.py         # OpenWeatherMap 연동
│   │   ├── vessel_tracker.py          # MarineTraffic 연동
│   │   └── route_optimizer.py         # 항로 최적화 알고리즘
│   └── utils/
│       ├── constants.py               # LNG 물성치 상수
│       └── math_helpers.py            # 수식 유틸
│
├── docs/
│   ├── BOG_THEORY.md                  # BOG 발생 이론 정리
│   ├── API_REFERENCE.md               # API 명세서
│   ├── ROUTE_ANALYSIS.md              # 항로 분석 (수에즈/파나마/희망봉)
│   └── references/
│       ├── bog_compressors_paper.pdf  # 참고 논문
│       └── lng_unloading_report.docx  # LNG 하역 보고서
│
├── docker-compose.yml                 # 전체 스택 실행
└── README.md
```

---

## 🔑 필요한 API 키

| API | 용도 | 발급 URL |
|-----|------|---------|
| Cesium Ion Token | 3D 지구본 렌더링 | https://ion.cesium.com |
| OpenWeatherMap | 실시간 기상 데이터 | https://openweathermap.org/api |
| MarineTraffic API | 선박 실시간 위치 | https://www.marinetraffic.com/en/ais-api-services |
| Google Maps (선택) | 위성 기본 지도 | https://mapsplatform.google.com |

`.env` 파일에 작성:
```
CESIUM_TOKEN=your_token_here
OPENWEATHER_API_KEY=your_key_here
MARINETRAFFIC_API_KEY=your_key_here
```

---

## 🚀 실행 방법

### 프론트엔드
```bash
# 간단히 브라우저에서 열기
open frontend/index.html

# 또는 로컬 서버
cd frontend
python -m http.server 3000
# → http://localhost:3000
```

### 백엔드
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs (Swagger UI)
```

### Docker 전체 실행
```bash
docker-compose up
```

---

## 📐 BOG 계산 공식 요약

```
BOR (%/day) = BOG생성량(kg/day) / 탱크내LNG질량(kg) × 100

BOG = Q_열유입 + Q_펌프열 + Q_배관열 + Q_플래시증기

Q_열유입 = U × A_탱크 × ΔT_대기-LNG × 계절보정
  ΔT = 대기온도 - (-162°C) = 대기온도 + 162

정상 범위: BOR 0.08 ~ 0.15 %/day
경고 수준: BOR > 0.15 %/day
위험 수준: BOR > 0.20 %/day (또는 탱크압력 > 140 g/cm²)
```

---

## 🗺 항로 분석

| 항로 | 거리 | BOG 특이사항 |
|------|------|-------------|
| 중동 → 동북아 (호르무즈~일본) | ~11,000 NM | 여름 고온 → BOR 상승 |
| 수에즈 운하 경유 | ~10,500 NM | 현재 분쟁으로 계류 대기 BOG 추가 |
| 희망봉 우회 | ~14,500 NM | 추가 항해 BOG vs 계류 BOG 비교 필요 |
| 파나마 운하 경유 | 통항 가능 여부 확인 필요 | 아프라막스 크기 제한 |

---

## 🔧 기술 스택

| 레이어 | 기술 |
|--------|------|
| 3D 지도 | Cesium.js (추천) / Mapbox GL JS |
| 프론트엔드 | Vanilla JS + HTML/CSS (현재) → React 전환 가능 |
| 백엔드 | Python FastAPI |
| BOG 계산 | Python (numpy, scipy 확장 예정) |
| 기상 API | OpenWeatherMap |
| 선박 추적 | MarineTraffic API |
| DB (추후) | PostgreSQL + TimescaleDB (시계열) |
| 배포 (추후) | Docker + Nginx |

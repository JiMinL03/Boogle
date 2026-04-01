// 주요 해로 마커 데이터
// type: 'canal' | 'strait' | 'cape'
export const WAYPOINTS = [
  // 운하
  { name: 'Suez Canal',          name_ko: '수에즈 운하',    lon:  32.35, lat:  30.50, type: 'canal'  },
  { name: 'Panama Canal',        name_ko: '파나마 운하',    lon: -79.92, lat:   9.10, type: 'canal'  },
  { name: 'Kiel Canal',          name_ko: '킬 운하',        lon:   9.68, lat:  54.32, type: 'canal'  },
  // 해협
  { name: 'Strait of Malacca',   name_ko: '말라카 해협',    lon: 103.80, lat:   1.35, type: 'strait' },
  { name: 'Strait of Hormuz',    name_ko: '호르무즈 해협',  lon:  56.45, lat:  26.55, type: 'strait' },
  { name: 'Strait of Gibraltar', name_ko: '지브롤터 해협',  lon:  -5.60, lat:  35.95, type: 'strait' },
  { name: 'Bosphorus Strait',    name_ko: '보스포루스 해협', lon:  29.02, lat:  41.10, type: 'strait' },
  { name: 'Bab-el-Mandeb',       name_ko: '밥엘만데브 해협', lon:  43.30, lat:  12.55, type: 'strait' },
  { name: 'Dover Strait',        name_ko: '도버 해협',      lon:   1.35, lat:  51.12, type: 'strait' },
  { name: 'Lombok Strait',       name_ko: '롬복 해협',      lon: 115.74, lat:  -8.50, type: 'strait' },
  { name: 'Taiwan Strait',       name_ko: '대만 해협',      lon: 119.50, lat:  24.50, type: 'strait' },
  { name: 'Tsugaru Strait',      name_ko: '쓰가루 해협',    lon: 140.80, lat:  41.50, type: 'strait' },
  // 갑 / 해로
  { name: 'Cape of Good Hope',   name_ko: '희망봉',         lon:  18.48, lat: -34.36, type: 'cape'   },
  { name: 'Cape Horn',           name_ko: '케이프혼',        lon: -67.30, lat: -55.97, type: 'cape'   },
]

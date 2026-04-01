"""
BOG Track — FastAPI Backend
LNG BOG 최적화 플랫폼 REST API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import asyncio
from datetime import datetime

from services.bog_calculator import BOGCalculator, VesselState, EnvironmentalConditions

app = FastAPI(title="BOG Track API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

calculator = BOGCalculator()

# ── Request / Response Models ─────────────────────────────────────
class BOGRequest(BaseModel):
    # 선박 정보
    cargo_volume_m3: float = 266000
    fill_ratio: float = 0.94
    tank_temp_celsius: float = -162.0
    tank_pressure_gcm2: float = 107.0
    speed_knots: float = 16.4
    # 환경 정보
    air_temp_celsius: float = 28.0
    sea_temp_celsius: float = 22.0
    wave_height_m: float = 2.0
    wind_speed_knots: float = 12.0
    solar_radiation_wm2: float = 600.0
    season: str = "summer"
    # 하역 여부
    is_unloading: bool = False

class WeatherRequest(BaseModel):
    lat: float
    lon: float

# ── Routes ───────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "BOG Track API", "status": "running", "time": datetime.utcnow().isoformat()}

@app.post("/api/bog/calculate")
def calculate_bog(req: BOGRequest):
    """BOG 발생량 계산"""
    vessel = VesselState(
        cargo_volume_m3=req.cargo_volume_m3,
        fill_ratio=req.fill_ratio,
        tank_temp_celsius=req.tank_temp_celsius,
        tank_pressure_gcm2=req.tank_pressure_gcm2,
        speed_knots=req.speed_knots,
    )
    env = EnvironmentalConditions(
        air_temp_celsius=req.air_temp_celsius,
        sea_temp_celsius=req.sea_temp_celsius,
        wave_height_m=req.wave_height_m,
        wind_speed_knots=req.wind_speed_knots,
        solar_radiation_wm2=req.solar_radiation_wm2,
        season=req.season,
    )
    result = calculator.calculate(vessel, env, req.is_unloading)
    return {
        "bor": result.total_bor_percent_per_day,
        "total_bog_t": result.total_bog_t,
        "breakdown": {
            "heat_ingress": result.heat_ingress_bog_t,
            "pump_heat": result.pump_heat_bog_t,
            "pipe_heat": result.pipe_heat_bog_t,
            "flash_vapor": result.flash_vapor_bog_t,
        },
        "tank_pressure_delta": result.tank_pressure_delta,
        "status": result.status,
        "recommendation": result.recommendation,
    }

@app.get("/api/weather")
async def get_weather(lat: float, lon: float, api_key: str = "YOUR_OPENWEATHER_KEY"):
    """OpenWeatherMap 기상 데이터 조회"""
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5)
            data = resp.json()
            return {
                "temp": data["main"]["temp"],
                "wind_speed": data["wind"]["speed"] * 1.944,  # m/s → knots
                "weather": data["weather"][0]["description"],
                "humidity": data["main"]["humidity"],
            }
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Weather API error: {e}")

@app.get("/api/vessels/mock")
def get_mock_vessels():
    """개발용 모의 선박 데이터"""
    return [
        {
            "id": "LNG-001", "name": "ARCTIC PIONEER",
            "lat": 26.0, "lon": 56.0,
            "speed": 16.4, "bor": 0.12, "status": "normal"
        },
        {
            "id": "LNG-002", "name": "PACIFIC EMPRESS",
            "lat": 1.2, "lon": 104.5,
            "speed": 14.8, "bor": 0.19, "status": "warn"
        },
        {
            "id": "LNG-003", "name": "SUEZ CHALLENGER",
            "lat": 12.5, "lon": 44.0,
            "speed": 11.2, "bor": 0.23, "status": "high"
        }
    ]

@app.get("/api/route/optimize")
def optimize_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float):
    """
    항로 최적화 제안
    현재: 수에즈 운하 vs 희망봉 경유 비교
    """
    # 중동 좌표 기준 수에즈 경유 여부 판단
    in_suez_risk_zone = (origin_lat > 10 and origin_lat < 30 and origin_lon > 30 and origin_lon < 60)
    
    if in_suez_risk_zone:
        return {
            "primary_route": "SUEZ_CANAL",
            "alternative_route": "CAPE_OF_GOOD_HOPE",
            "suez_risk": "HIGH",
            "recommendation": "CAPE_OF_GOOD_HOPE",
            "extra_distance_nm": 4200,
            "extra_bog_ton": 0.8,
            "fuel_saving_pct": 12.4,
            "reason": "중동 분쟁으로 수에즈 운하 대기 시간 증가. 계류 BOG 손실 vs 우회 추가 BOG 비교 시 우회 유리."
        }
    return {
        "primary_route": "DIRECT",
        "suez_risk": "LOW",
        "recommendation": "CURRENT_ROUTE",
        "reason": "현재 항로 유지 권장."
    }

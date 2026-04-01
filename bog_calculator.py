"""
BOG (Boil-Off Gas) Calculation Engine
LNG 선박 BOG 발생량 예측 모델
"""

import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class VesselState:
    """선박 현재 상태"""
    cargo_volume_m3: float        # 탱크 용량 (m³)
    fill_ratio: float             # 충전율 (0~1)
    tank_temp_celsius: float      # 탱크 내 LNG 온도 (°C), 보통 -162
    tank_pressure_gcm2: float     # 탱크 압력 (g/cm²)
    speed_knots: float            # 선박 속도 (knots)


@dataclass
class EnvironmentalConditions:
    """환경 조건"""
    air_temp_celsius: float       # 대기 온도 (°C)
    sea_temp_celsius: float       # 해수 온도 (°C)
    wave_height_m: float          # 파고 (m)
    wind_speed_knots: float       # 풍속 (knots)
    solar_radiation_wm2: float    # 태양 복사 (W/m²)
    season: str                   # 'summer' | 'winter' | 'spring' | 'autumn'


@dataclass
class BOGResult:
    """BOG 계산 결과"""
    total_bor_percent_per_day: float   # 전체 BOR (%/day)
    heat_ingress_bog_t: float          # 열 유입 BOG (ton/day)
    pump_heat_bog_t: float             # 펌프 열 BOG (ton/day)
    pipe_heat_bog_t: float             # 배관 열 BOG (ton/day)
    flash_vapor_bog_t: float           # 플래시 증기 BOG (ton/day)
    total_bog_t: float                 # 총 BOG (ton/day)
    tank_pressure_delta: float         # 탱크 압력 변화 예측 (g/cm²)
    status: str                        # 'normal' | 'warning' | 'critical'
    recommendation: str                # 운항 권고사항


class BOGCalculator:
    """
    LNG BOG 계산 엔진
    
    기반 이론:
    - BOR (Boil-Off Rate) = BOG생성량 / 탱크내LNG양 × 100 (%/day)
    - 열 유입 = 탱크 단열 성능 × 온도차 × 시간
    - 일반 LNG선: BOR ≈ 0.10~0.15%/day
    - 위험 수준: BOR > 0.20%/day
    """
    
    # LNG 물성치
    LNG_DENSITY = 450.0          # kg/m³ (평균)
    LNG_LATENT_HEAT = 510.0      # kJ/kg (기화잠열)
    LNG_BOILING_POINT = -162.0   # °C
    
    # 탱크 단열 성능 (W/m²·K) - Moss 타입 기준
    TANK_HEAT_TRANSFER_COEFF = 0.032
    
    # 계절 보정 계수
    SEASON_FACTOR = {
        'summer': 1.25,
        'autumn': 1.0,
        'spring': 0.95,
        'winter': 0.75
    }

    def calculate(
        self,
        vessel: VesselState,
        env: EnvironmentalConditions,
        is_unloading: bool = False
    ) -> BOGResult:
        """
        BOG 전체 계산
        """
        cargo_mass_kg = vessel.cargo_volume_m3 * vessel.fill_ratio * self.LNG_DENSITY
        
        # 1. 열 유입에 의한 BOG
        heat_ingress_bog = self._calc_heat_ingress_bog(vessel, env)
        
        # 2. 펌프 열에 의한 BOG
        pump_heat_bog = self._calc_pump_heat_bog(vessel, is_unloading)
        
        # 3. 배관 열에 의한 BOG
        pipe_heat_bog = self._calc_pipe_heat_bog(vessel, env, is_unloading)
        
        # 4. 플래시 증기 (하역 시 압력차)
        flash_vapor_bog = self._calc_flash_vapor_bog(vessel, is_unloading)
        
        # 총 BOG
        total_bog_t = (heat_ingress_bog + pump_heat_bog + pipe_heat_bog + flash_vapor_bog) / 1000
        
        # BOR 계산
        bor = (total_bog_t * 1000 / cargo_mass_kg) * 100  # %/day
        
        # 탱크 압력 변화 예측
        pressure_delta = self._calc_pressure_delta(bor, vessel, is_unloading)
        
        # 상태 및 권고사항
        status, recommendation = self._evaluate_status(bor, vessel.tank_pressure_gcm2, pressure_delta)
        
        return BOGResult(
            total_bor_percent_per_day=round(bor, 4),
            heat_ingress_bog_t=round(heat_ingress_bog / 1000, 3),
            pump_heat_bog_t=round(pump_heat_bog / 1000, 3),
            pipe_heat_bog_t=round(pipe_heat_bog / 1000, 3),
            flash_vapor_bog_t=round(flash_vapor_bog / 1000, 3),
            total_bog_t=round(total_bog_t, 3),
            tank_pressure_delta=round(pressure_delta, 2),
            status=status,
            recommendation=recommendation
        )

    def _calc_heat_ingress_bog(self, vessel: VesselState, env: EnvironmentalConditions) -> float:
        """
        열 유입에 의한 BOG 계산 (kg/day)
        Q = U × A × ΔT
        """
        # 탱크 표면적 추정 (구형 탱크 가정)
        tank_volume = vessel.cargo_volume_m3 / 4  # 4탱크 중 1탱크
        tank_radius = (3 * tank_volume / (4 * math.pi)) ** (1/3)
        tank_surface_area = 4 * math.pi * tank_radius ** 2
        total_surface = tank_surface_area * 4
        
        # 유효 온도차
        delta_t = env.air_temp_celsius - self.LNG_BOILING_POINT
        
        # 태양 복사 보정
        solar_equiv_temp = env.solar_radiation_wm2 * 0.015
        
        # 계절 보정
        season_factor = self.SEASON_FACTOR.get(env.season, 1.0)
        
        # 열 전달량 (W → kJ/day)
        Q_watts = self.TANK_HEAT_TRANSFER_COEFF * total_surface * (delta_t + solar_equiv_temp)
        Q_kj_per_day = Q_watts * 86400 / 1000
        
        # BOG 질량 (kg/day)
        bog_kg = Q_kj_per_day / self.LNG_LATENT_HEAT * season_factor
        return bog_kg

    def _calc_pump_heat_bog(self, vessel: VesselState, is_unloading: bool) -> float:
        """
        LNG 펌프 열 유입에 의한 BOG (kg/day)
        """
        pump_power_kw = 400 if is_unloading else 150
        pump_efficiency = 0.75
        heat_to_lng_ratio = 0.15  # 펌프 열의 15%가 LNG로 전달

        Q_kj_per_day = pump_power_kw * (1 - pump_efficiency) * heat_to_lng_ratio * 86400 / 1000
        return Q_kj_per_day / self.LNG_LATENT_HEAT * 1000

    def _calc_pipe_heat_bog(self, vessel: VesselState, env: EnvironmentalConditions, is_unloading: bool) -> float:
        """
        하역 배관으로부터의 열 유입 BOG (kg/day)
        """
        if not is_unloading:
            return 20.0  # 항해 중 소량 발생
        
        # 하역 배관 길이 및 단열 계수
        pipe_length_m = 200
        pipe_diameter_m = 0.4
        pipe_insulation_u = 0.05  # W/m²·K
        
        pipe_area = math.pi * pipe_diameter_m * pipe_length_m
        delta_t = env.air_temp_celsius - self.LNG_BOILING_POINT
        
        Q_watts = pipe_insulation_u * pipe_area * delta_t
        Q_kj_per_day = Q_watts * 86400 / 1000
        return Q_kj_per_day / self.LNG_LATENT_HEAT * 1000

    def _calc_flash_vapor_bog(self, vessel: VesselState, is_unloading: bool) -> float:
        """
        배-저장탱크 압력차에 의한 flash vapor BOG
        하역 시 저장탱크 압력 약 50 g/cm² 상승
        """
        if not is_unloading:
            return 0.0
        
        # 압력차 기반 플래시 증기 추정
        pressure_diff_bar = 0.05  # ≈ 50 g/cm²
        flash_fraction = 0.003    # 압력 해제 시 기화 분율
        
        cargo_mass_kg = vessel.cargo_volume_m3 * vessel.fill_ratio * self.LNG_DENSITY
        flash_bog_kg = cargo_mass_kg * flash_fraction * pressure_diff_bar
        return flash_bog_kg

    def _calc_pressure_delta(self, bor: float, vessel: VesselState, is_unloading: bool) -> float:
        """
        BOG 발생에 따른 탱크 압력 변화 예측 (g/cm²)
        """
        base_delta = bor * 15
        if is_unloading:
            base_delta += 50  # 하역 시 압력 상승
        return base_delta

    def _evaluate_status(self, bor: float, current_pressure: float, pressure_delta: float) -> tuple:
        """
        BOG 상태 평가 및 권고사항 생성
        """
        projected_pressure = current_pressure + pressure_delta

        if bor > 0.20 or projected_pressure > 140:
            status = 'critical'
            recommendation = (
                "⚠ 긴급: BOG 발생량 임계치 초과. "
                "BOG 압축기 즉시 가동 증가. "
                "속도 감소 검토 (16→12노트). "
                "선장 보고 필요."
            )
        elif bor > 0.15 or projected_pressure > 120:
            status = 'warning'
            recommendation = (
                "△ 주의: BOG 발생량 상승 추세. "
                "압축기 운전 상태 점검. "
                "기상 변화 모니터링 강화."
            )
        elif bor < 0.08:
            status = 'low'
            recommendation = (
                "ℹ BOG 발생량 낮음. "
                "압축기 과다 운전 위험 — 운전 부하 감소 검토."
            )
        else:
            status = 'normal'
            recommendation = "✓ 정상 운항 범위. 현재 설정 유지."

        return status, recommendation


# ─── 사용 예시 ────────────────────────────────────────────────────
if __name__ == '__main__':
    calc = BOGCalculator()

    # 항해 중 시나리오 (수에즈 우회 항로, 여름)
    vessel = VesselState(
        cargo_volume_m3=266000,  # Q-MAX 기준
        fill_ratio=0.94,
        tank_temp_celsius=-161.5,
        tank_pressure_gcm2=107,
        speed_knots=16.4
    )

    env = EnvironmentalConditions(
        air_temp_celsius=38,     # 중동 여름
        sea_temp_celsius=28,
        wave_height_m=2.1,
        wind_speed_knots=14,
        solar_radiation_wm2=850,
        season='summer'
    )

    result = calc.calculate(vessel, env, is_unloading=False)

    print("=" * 50)
    print("BOG CALCULATION RESULT")
    print("=" * 50)
    print(f"총 BOR:          {result.total_bor_percent_per_day:.4f} %/day")
    print(f"총 BOG:          {result.total_bog_t:.2f} ton/day")
    print(f"  - 열 유입:     {result.heat_ingress_bog_t:.2f} t/day")
    print(f"  - 펌프 열:     {result.pump_heat_bog_t:.2f} t/day")
    print(f"  - 배관 열:     {result.pipe_heat_bog_t:.2f} t/day")
    print(f"  - 플래시:      {result.flash_vapor_bog_t:.2f} t/day")
    print(f"탱크 압력 변화:  +{result.tank_pressure_delta:.1f} g/cm²")
    print(f"상태:            {result.status.upper()}")
    print(f"권고사항:        {result.recommendation}")

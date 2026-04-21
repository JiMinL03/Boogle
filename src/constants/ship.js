export const SHIP = {
  knots:                16,        // 항해 속도 (노트)
  fuelTonPerHour:        3.0,      // 연료 소비율 (ton/hr) — ME-GI / X-DF
  get fuelTonPerDay() { return this.fuelTonPerHour * 24 }, // 76.8 ton/day
  capacityM3:          174_000,    // 선박 크기 (m³)
  engineBOGTonPerHour:   3.0,      // 엔진 BOG 소모율 (ton/hr)
  reLiqCapacityT:       20,        // 재액화 누적 최대 용량 (ton)
}

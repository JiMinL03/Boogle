export const SHIP = {
  knots:          16,       // 항해 속도 (노트)
  fuelTonPerHour: 5.4,      // 연료 소비율 (ton/hr)
  get fuelTonPerDay() { return this.fuelTonPerHour * 24 }, // 129.6 ton/day
  capacityM3: 266_000,      // 선박 크기 (m³)
}

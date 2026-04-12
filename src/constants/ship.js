export const SHIP = {
  knots:          16,       // 항해 속도 (노트)
  fuelTonPerHour: 4.8,      // 기준 연료 소비율 (ton/hr)
  get fuelTonPerDay() { return this.fuelTonPerHour * 24 }, // 115.2 ton/day
}

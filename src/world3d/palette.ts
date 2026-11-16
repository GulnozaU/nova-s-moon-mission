/** Low-poly pastel toon palette — peach, sage, lavender, dusty blue, cream, warm yellow. */
export const PALETTE = {
  peach: "#e8b89a",
  sage: "#9fba9a",
  lavender: "#b8a8c8",
  dustyBlue: "#8aa4b8",
  cream: "#f5efe6",
  warmYellow: "#e8c96a",
  ink: "#3a3348",
  moonDust: "#d4c4b0",
  moonDark: "#b8a898",
  skyDay: "#c8d8e8",
  skyNight: "#2a3048",
  wall: "#e8dcc8",
  floorHome: "#c8b8a0",
  floorGh: "#a8c8a0",
  floorLab: "#a8b8c8",
  outline: "#3a3348",
} as const;

export type PlaceId3d = "surface" | "home" | "greenhouse" | "lab";

/** World sizes (units). Nova ≈ 1.2 tall. */
export const WORLD = {
  surface: { w: 60, d: 45 },
  interior: { w: 16, d: 12 },
  novaHeight: 1.2,
  /** units/s — surface door-to-door (≈30u) under 4s. */
  walkSpeed: 8,
  walkSpeedFast: 10,
} as const;

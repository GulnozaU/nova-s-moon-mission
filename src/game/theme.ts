/**
 * Shared smooth 2D look — matches React UI (Baloo/Nunito), not pixel/Courier.
 */
export const THEME = {
  ink: "#3a3348",
  inkSoft: "#6a6278",
  cream: "#fff8ef",
  parchment: "#f3ebe0",
  peach: "#e2b48a",
  sage: "#8fa887",
  sageInk: "#4d6548",
  rose: "#c98b7b",
  sky: "#9eb6c9",
  skyDeep: "#6f8fa8",
  gold: "#e0c15a",
  water: "#7aa7c4",
  line: 0x3a3348,
  panel: 0xfff8ef,
  panelAlt: 0xf3ebe0,
  accent: 0xe0c15a,
  good: 0x8fa887,
  bad: 0xc98b7b,
  dim: 0x3a3348,
  font: "Nunito, system-ui, sans-serif",
  fontDisplay: "Baloo 2, Nunito, system-ui, sans-serif",
} as const;

export const UI_TEXT = {
  title: {
    fontFamily: THEME.fontDisplay,
    fontSize: "22px",
    color: THEME.ink,
    fontStyle: "bold",
  },
  body: {
    fontFamily: THEME.font,
    fontSize: "14px",
    color: THEME.ink,
  },
  small: {
    fontFamily: THEME.font,
    fontSize: "12px",
    color: THEME.inkSoft,
  },
  hud: {
    fontFamily: THEME.font,
    fontSize: "13px",
    color: THEME.ink,
  },
} as const;

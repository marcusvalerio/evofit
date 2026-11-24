import type { MedalLevel } from "./medals"

/** Cores e desenhos da medalha em hexágono (Design System · Medalhas). */
export const MEDAL_LOOK: Record<MedalLevel, { a: string; b: string; c: string; edge: string; ink: string }> = {
  bronze: { a: "#F6D3BC", b: "#D08A5E", c: "#9A5534", edge: "#8C4A2A", ink: "#5E2E16" },
  prata: { a: "#FFFFFF", b: "#C9D2D4", c: "#8E9A9D", edge: "#6F7B7E", ink: "#3F4A4D" },
  ouro: { a: "#FFF4C4", b: "#E6B422", c: "#B8860B", edge: "#8A6400", ink: "#5C4300" },
  absoluto: { a: "#2F3A3D", b: "#0F1C1F", c: "#46B8BA", edge: "#0F1C1F", ink: "#F1FF93" },
}
export const MEDAL_GLYPH: Record<MedalLevel, string> = {
  bronze: "m5 12.5 4.5 4.5L19 7.5",
  prata: "M12 3.5c.9 3.6 5.5 5.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.8 1.8-3.9 1.8-5.6 1.9.9 2.7 2.8 2.7 2.8s1-3.3 1-7.4Z",
  ouro: "M7.5 4h9v5a4.5 4.5 0 0 1-9 0ZM7.5 6H5v.8A3.2 3.2 0 0 0 7.9 10M16.5 6H19v.8a3.2 3.2 0 0 1-2.9 3.2M12 13.5V17M8.5 20h7M9.5 20l.5-3h4l.5 3",
  absoluto: "M8.5 3 11 8.6M15.5 3 13 8.6M12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z",
}
export const MEDAL_HEX = "M48 6 84 27v42L48 90 12 69V27Z"
export const MEDAL_INNER = "M48 14 77 31v34L48 82 19 65V31Z"

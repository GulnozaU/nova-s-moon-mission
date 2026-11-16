export type PlaceId = "surface" | "home" | "greenhouse" | "lab";

export type DoorDef = {
  id: string;
  /** UV center of door trigger on the painting. */
  uv: [number, number];
  radiusUv: number;
  to: PlaceId;
  label: string;
};

export type FloorDef = {
  id: PlaceId;
  painting: string;
  depth: string;
  paintingSize: [number, number];
  /** World width × depth (walk plane). Sized for ~3–4s room cross. */
  worldSize: [number, number];
  floorPolygonUv: [number, number][];
  spawnUv: [number, number];
  doors: DoorDef[];
  billboards?: Array<{
    id: string;
    url?: string;
    uv: [number, number];
    scale: number;
  }>;
};

export const PLACE_LABELS: Record<PlaceId, string> = {
  surface: "Surface",
  home: "Home",
  greenhouse: "Plants",
  lab: "Lab",
};

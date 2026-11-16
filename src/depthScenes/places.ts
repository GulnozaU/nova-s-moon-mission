import type { FloorDef, PlaceId } from "./types";
import surface from "./floors/surface.json";
import home from "./floors/home.json";
import greenhouse from "./floors/greenhouse.json";
import lab from "./floors/lab.json";

function asFloor(data: unknown): FloorDef {
  return data as FloorDef;
}

export const FLOORS: Record<PlaceId, FloorDef> = {
  surface: asFloor(surface),
  home: asFloor(home),
  greenhouse: asFloor(greenhouse),
  lab: asFloor(lab),
};

export function getFloor(id: PlaceId): FloorDef {
  return FLOORS[id];
}

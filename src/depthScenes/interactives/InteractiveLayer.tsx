import { useMemo, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { DayDecisions } from "../../engine/types";
import type { GameState } from "../../types";
import type { FloorDef, PlaceId } from "../types";
import { interactivesFor } from "./catalog";
import { Hotspot } from "./Hotspot";
import { runInteractive } from "./actions";
import type { DragPayload, InteractiveDef, PlaceFx } from "./types";
import { audio } from "../../audio/audio";

type Props = {
  place: PlaceId;
  floor: FloorDef;
  decisions: DayDecisions;
  state: GameState;
  powerToday: number;
  fx: PlaceFx;
  setFx: (patch: Partial<PlaceFx> | ((p: PlaceFx) => PlaceFx)) => void;
  drag: DragPayload | null;
  setDrag: (d: DragPayload | null) => void;
  novaPosRef: MutableRefObject<THREE.Vector3>;
  onDecisions: (patch: Partial<DayDecisions>) => void;
  onNovaLine: (line: string) => void;
  onInfo: (text: string, badge?: string) => void;
  onGoPlace: (id: PlaceId) => void;
  onEndDay: () => void;
};

export function InteractiveLayer({
  place,
  floor,
  decisions,
  state,
  powerToday,
  fx,
  setFx,
  drag,
  setDrag,
  novaPosRef,
  onDecisions,
  onNovaLine,
  onInfo,
  onGoPlace,
  onEndDay,
}: Props) {
  const items = useMemo(() => interactivesFor(place), [place]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activate = (def: InteractiveDef) => {
    const [ww, dd] = floor.worldSize;
    const wx = (def.uv[0] - 0.5) * ww;
    const wz = (def.uv[1] - 0.35) * dd;
    const nova = novaPosRef.current;
    const dist = Math.hypot(nova.x - wx, nova.z - wz);
    const near = dist <= (def.useRadius ?? 2.2);

    const payload = def.kind === "drop" ? drag : null;

    if (def.kind === "drop" && !payload) {
      audio.play("uiHover");
      onNovaLine(
        `Drag ${def.accepts?.join(" or ") ?? "an item"} onto ${def.label}.`,
      );
      setActiveId(def.id);
      return;
    }

    const result = runInteractive({
      def,
      payload,
      decisions,
      state,
      powerToday,
      fx,
      near: def.kind === "use" ? near : true,
    });

    setActiveId(def.id);
    audio.play(result.ok ? def.sfx : "uiClick");
    if (result.ok && def.sfxDone) audio.play(def.sfxDone);

    if (result.message) onNovaLine(result.message);
    if (result.infoOverride) onInfo(result.infoOverride, def.info?.badge);
    else if (result.ok && def.info && def.kind === "info") {
      onInfo(def.info.text, def.info.badge);
    }

    if (result.patch) onDecisions(result.patch);
    if (result.fx) setFx((prev) => ({ ...prev, ...result.fx! }));
    if (result.goPlace) onGoPlace(result.goPlace);
    if (result.endDay) onEndDay();
    if (result.ok && payload) setDrag(null);

    // USE pickups auto-arm a carry payload.
    if (result.ok && def.id === "gh_tap") setDrag({ kind: "water", amount: 1 });
    if (result.ok && def.id === "surface_crates")
      setDrag({ kind: "crate", amount: 2 });
    if (result.ok && (def.id === "lab_rack" || def.id === "lab_drawer"))
      setDrag({ kind: "sample", amount: 1 });

    window.setTimeout(() => setActiveId(null), 900);
  };

  return (
    <>
      {items.map((def) => {
        const [ww, dd] = floor.worldSize;
        const wx = (def.uv[0] - 0.5) * ww;
        const wz = (def.uv[1] - 0.35) * dd;
        const nova = novaPosRef.current;
        const near =
          Math.hypot(nova.x - wx, nova.z - wz) <= (def.useRadius ?? 2.2);
        return (
          <Hotspot
            key={def.id}
            def={def}
            floor={floor}
            decisions={decisions}
            fx={fx}
            active={activeId === def.id}
            drag={drag}
            novaNear={near}
            onActivate={activate}
            onHover={() => undefined}
          />
        );
      })}
    </>
  );
}

import Phaser from "phaser";
import { THEME } from "../theme";
import type { DragController } from "../drag/DragController";
import { audio } from "../../audio/audio";

export type CrewId = "sam" | "mira" | "ana";

export type CrewShelterMap = Record<CrewId, boolean>;

const CREW: { id: CrewId; name: string; color: number }[] = [
  { id: "sam", name: "Sam", color: 0x7aa7c4 },
  { id: "mira", name: "Mira", color: 0x8fa887 },
  { id: "ana", name: "Ana", color: 0xc98b7b },
];

/**
 * Storm-day HUD: drag crew portraits onto Crew home to shelter them.
 */
export class StormCrewHud {
  private root: Phaser.GameObjects.Container;
  private portraits: Phaser.GameObjects.Container[] = [];
  private shelter: CrewShelterMap;
  private onChange: (s: CrewShelterMap) => void;
  private drag: DragController;

  constructor(
    scene: Phaser.Scene,
    drag: DragController,
    shelter: CrewShelterMap,
    onChange: (s: CrewShelterMap) => void,
  ) {
    this.drag = drag;
    this.shelter = { ...shelter };
    this.onChange = onChange;
    const { width: W } = scene.scale;
    this.root = scene.add.container(W / 2, 108).setDepth(88).setScrollFactor(0);

    const title = scene.add
      .text(0, -28, "Storm! Drag crew into Home", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: "#fff8ef",
        backgroundColor: "#c98b7b",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    this.root.add(title);

    CREW.forEach((c, i) => {
      const x = (i - 1) * 72;
      const p = scene.add.container(x, 8);
      const face = scene.add
        .circle(0, 0, 22, c.color, 0.95)
        .setStrokeStyle(2, THEME.line, 0.35);
      const label = scene.add
        .text(0, 0, c.name[0]!, {
          fontFamily: THEME.fontDisplay,
          fontSize: "16px",
          color: THEME.cream,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      const tag = scene.add
        .text(0, 28, c.name, {
          fontFamily: THEME.font,
          fontSize: "10px",
          color: THEME.ink,
          backgroundColor: THEME.cream,
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      p.add([face, label, tag]);
      p.setSize(48, 56);
      p.setInteractive(
        new Phaser.Geom.Rectangle(-24, -24, 48, 56),
        Phaser.Geom.Rectangle.Contains,
      );
      p.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
        if (this.shelter[c.id]) return;
        ptr.event.stopPropagation();
        audio.play("pick");
        this.drag.begin(
          { kind: "nova", amount: 1, sourceId: c.id },
          ptr.worldX,
          ptr.worldY,
        );
      });
      this.root.add(p);
      this.portraits.push(p);
      this.refreshOne(c.id, i);
    });
  }

  private refreshOne(id: CrewId, index: number) {
    const p = this.portraits[index];
    if (!p) return;
    const inHome = this.shelter[id];
    p.setAlpha(inHome ? 0.35 : 1);
  }

  markSheltered(id: CrewId) {
    if (this.shelter[id]) return;
    this.shelter[id] = true;
    const idx = CREW.findIndex((c) => c.id === id);
    this.refreshOne(id, idx);
    this.onChange({ ...this.shelter });
    audio.play("jobDone");
  }

  /** Call when a nova-drop lands on the home shelter zone with sourceId. */
  tryReceive(sourceId?: string): boolean {
    if (!sourceId) return false;
    if (sourceId !== "sam" && sourceId !== "mira" && sourceId !== "ana") {
      return false;
    }
    this.markSheltered(sourceId);
    return true;
  }

  count(): number {
    return CREW.filter((c) => this.shelter[c.id]).length;
  }

  destroy() {
    this.root.destroy(true);
  }
}

export function emptyCrewShelter(): CrewShelterMap {
  return { sam: false, mira: false, ana: false };
}

export function countSheltered(s: CrewShelterMap): number {
  return (s.sam ? 1 : 0) + (s.mira ? 1 : 0) + (s.ana ? 1 : 0);
}

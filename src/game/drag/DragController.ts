import Phaser from "phaser";
import type { DragPayload } from "./types";
import type { JobStation } from "../ui/JobStation";
import { audio } from "../../audio/audio";

/**
 * Scene-level drag helper: ghost follows pointer; drop hits JobStations.
 * Call begin() from interactive sources; scenes register stations.
 */
export class DragController {
  private scene: Phaser.Scene;
  private stations: JobStation[] = [];
  private ghost: Phaser.GameObjects.Container | null = null;
  private payload: DragPayload | null = null;
  private active = false;
  /** When true, pointer moves are for drag — scenes should skip walk targets. */
  dragging = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off("pointermove", this.onMove, this);
      scene.input.off("pointerup", this.onUp, this);
      this.clearGhost();
    });
  }

  register(station: JobStation) {
    this.stations.push(station);
  }

  begin(payload: DragPayload, x: number, y: number, color = 0xffe08a) {
    this.clearGhost();
    this.payload = payload;
    this.active = true;
    this.dragging = true;
    const g = this.scene.add.container(x, y).setDepth(200);
    const tex = ghostTexture(this.scene, payload.kind);
    const body = tex
      ? this.scene.add.image(0, 0, tex).setDisplaySize(
          payload.kind === "chip" ? 22 : 36,
          payload.kind === "chip" ? 22 : 32,
        )
      : payload.kind === "chip"
        ? this.scene.add.rectangle(0, 0, 18, 26, color, 0.95).setStrokeStyle(2, 0x3a3348, 0.5)
        : payload.kind === "material"
          ? this.scene.add.rectangle(0, 0, 28, 22, 0xb08968, 0.95).setStrokeStyle(2, 0x3a3348, 0.45)
          : payload.kind === "water"
            ? this.scene.add.ellipse(0, 0, 16, 22, 0x3a7ca5, 0.95)
            : this.scene.add.circle(0, 0, 14, 0xffe08a, 0.9);
    g.add(body);
    if (!tex) {
      const tag = this.scene.add
        .text(0, 0, labelFor(payload.kind), {
          fontFamily: "Pixelify Sans, Nunito, sans-serif",
          fontSize: "10px",
          color: "#fff8ef",
        })
        .setOrigin(0.5);
      g.add(tag);
    }
    this.ghost = g;
    audio.play("pick");
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (!this.active || !this.ghost) return;
    this.ghost.setPosition(p.worldX, p.worldY);
    for (const s of this.stations) {
      s.setHighlight(Boolean(this.payload && s.accepts(this.payload) && s.contains(p.worldX, p.worldY)));
    }
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (!this.active || !this.payload) {
      this.dragging = false;
      return;
    }
    const payload = this.payload;
    let hit: JobStation | null = null;
    for (const s of this.stations) {
      if (s.accepts(payload) && s.contains(p.worldX, p.worldY)) {
        hit = s;
        break;
      }
    }
    for (const s of this.stations) s.setHighlight(false);
    this.clearGhost();
    this.active = false;
    this.payload = null;
    // Defer so scene pointerup/walk doesn't fire on same frame.
    this.scene.time.delayedCall(30, () => {
      this.dragging = false;
    });
    if (hit) {
      const ok = hit.receive(payload);
      audio.play(ok ? "drop" : "uiClick");
      if (ok) audio.play("jobDone");
    }
  }

  private clearGhost() {
    this.ghost?.destroy(true);
    this.ghost = null;
  }
}

function ghostTexture(
  scene: Phaser.Scene,
  kind: DragPayload["kind"],
): string | null {
  if (kind === "chip" && scene.textures.exists("chip")) return "chip";
  if (kind === "material" && scene.textures.exists("crates")) return "crates";
  if (kind === "water" && scene.textures.exists("waterDrop")) return "waterDrop";
  if (kind === "nova" && scene.textures.exists("nova")) return "nova";
  return null;
}

function labelFor(kind: DragPayload["kind"]): string {
  if (kind === "chip") return "⚡";
  if (kind === "material") return "📦";
  if (kind === "water") return "💧";
  return "N";
}

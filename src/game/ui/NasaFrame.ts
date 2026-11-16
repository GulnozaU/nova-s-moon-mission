import Phaser from "phaser";
import { bridge } from "../bridge";
import { nasaImageForContext, nasaImageForDay } from "../../content/imageForContext";
import { nasaKidCaption } from "../../content/nasaCaption";
import { THEME } from "../theme";

/**
 * Soft 2D photo frame that rotates NASA stills by day / event.
 * Lab wall prefers the real storm still when a warning or storm day is active.
 */
export class NasaFrame {
  private root: Phaser.GameObjects.Container;
  private photo!: Phaser.GameObjects.Image;
  private caption!: Phaser.GameObjects.Text;
  private lastKey = "";
  private preferStorm: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, preferStorm = false) {
    this.preferStorm = preferStorm;
    this.root = scene.add.container(x, y).setDepth(55);

    const mat = scene.add
      .rectangle(0, 0, 168, 148, THEME.panel)
      .setStrokeStyle(3, THEME.line, 0.25);
    this.photo = scene.add.image(0, -8, "nasa_title").setDisplaySize(148, 100);
    this.caption = scene.add
      .text(0, 58, "", {
        fontFamily: THEME.font,
        fontSize: "10px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5);
    const tag = scene.add
      .text(0, -62, "NASA wall screen", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.root.add([mat, this.photo, tag, this.caption]);
    this.refresh();
  }

  refresh() {
    try {
      const b = bridge();
      const event = b.getEvent();
      const day = b.getDay();
      const alerts = b.getStormAlerts();
      const stormy =
        this.preferStorm &&
        (event?.stormSeverity !== undefined || alerts.length > 0);
      const img = stormy
        ? nasaImageForContext(event?.id ?? "storm", day)
        : event
          ? nasaImageForContext(event.id, day)
          : nasaImageForDay(day);
      const key = `nasa_${img.slot}`;
      if (key !== this.lastKey && this.photo.scene.textures.exists(key)) {
        this.lastKey = key;
        this.photo.setTexture(key).setDisplaySize(148, 100);
      }
      this.caption.setText(
        nasaKidCaption(img, {
          eventDate: event?.eventDate ?? alerts[0]?.eventDate,
        }),
      );
    } catch {
      /* bridge */
    }
  }
}

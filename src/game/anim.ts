import Phaser from "phaser";

/** Soft ground shadow under a 2D character. */
export function addShadow(
  scene: Phaser.Scene,
  follow: Phaser.GameObjects.Sprite,
  width = 48,
): { shadow: Phaser.GameObjects.Ellipse; sync: () => void } {
  const shadow = scene.add
    .ellipse(follow.x, follow.y + 36, width, 14, 0x000000, 0.3)
    .setDepth(follow.depth - 1);

  const sync = () => {
    shadow.setPosition(follow.x, follow.y + follow.displayHeight * 0.4);
    shadow.setVisible(follow.visible);
  };
  return { shadow, sync };
}

/** Idle breathe forever. */
export function idleBreathe(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
) {
  const sy = sprite.scaleY;
  return scene.tweens.add({
    targets: sprite,
    scaleY: sy * 1.04,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
}

/** Walk hop while velocity is non-zero. */
export function walkHop(
  sprite: Phaser.Physics.Arcade.Sprite,
): { sync: () => void } {
  let t = 0;
  let baseScaleY = sprite.scaleY;
  const sync = () => {
    const body = sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 12;
    if (moving) {
      t += 0.45;
      sprite.setScale(sprite.scaleX, baseScaleY * (1 + Math.sin(t) * 0.07));
      if (body.velocity.x < -4) sprite.setFlipX(true);
      if (body.velocity.x > 4) sprite.setFlipX(false);
    }
  };
  return { sync };
}

/** Cute spark burst for interactions. */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color = 0xfff1a8) {
  for (let i = 0; i < 6; i++) {
    const p = scene.add.circle(x, y, 3 + Math.random() * 2, color, 0.95).setDepth(50);
    scene.tweens.add({
      targets: p,
      x: x + (Math.random() - 0.5) * 55,
      y: y - 24 - Math.random() * 36,
      alpha: 0,
      duration: 420 + Math.random() * 180,
      onComplete: () => p.destroy(),
    });
  }
}

/** Soft painted moon ground (smooth 2D, not pixel). */
export function paintMoonGround(scene: Phaser.Scene, w: number, h: number, night: boolean) {
  const skyTop = night ? 0x2a3348 : 0x9eb6c9;
  const skyBot = night ? 0x4a4558 : 0xd5c4b0;
  const g = scene.add.graphics().setDepth(0);
  g.fillGradientStyle(skyTop, skyTop, skyBot, skyBot, 1);
  g.fillRect(0, 0, w, h * 0.45);

  const groundY = h * 0.42;
  g.fillStyle(night ? 0x5a5568 : 0xc9b8a8, 1);
  g.fillRect(0, groundY, w, h - groundY);

  for (let i = 0; i < 18; i++) {
    const cx = 40 + Math.random() * (w - 80);
    const cy = groundY + 40 + Math.random() * (h - groundY - 80);
    const r = 8 + Math.random() * 22;
    g.fillStyle(night ? 0x3a3548 : 0xb8a898, 0.5);
    g.fillCircle(cx, cy, r);
  }
}

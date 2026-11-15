import Phaser from "phaser";

/** Soft ground shadow under a 2D character (adventure-game look). */
export function addShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width = 44,
): Phaser.GameObjects.Ellipse {
  return scene.add
    .ellipse(x, y + 38, width, 14, 0x000000, 0.28)
    .setDepth(5);
}

/** Idle breathe + walk bounce while moving (Pazu / adventure style). */
export function attachCharacterMotion(
  scene: Phaser.Scene,
  sprite: Phaser.Physics.Arcade.Sprite,
  shadow: Phaser.GameObjects.Ellipse,
): { sync: () => void; destroy: () => void } {
  const idle = scene.tweens.add({
    targets: sprite,
    scaleY: sprite.scaleY * 1.03,
    duration: 650,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });

  let walkPulse = 0;

  const sync = () => {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    const moving = Boolean(body && (Math.abs(body.velocity.x) > 8 || Math.abs(body.velocity.y) > 8));
    shadow.setPosition(sprite.x, sprite.y + sprite.displayHeight * 0.42);
    if (moving) {
      idle.pause();
      walkPulse += 0.35;
      sprite.setScale(
        sprite.scaleX < 0 ? -Math.abs(sprite.scaleX) : Math.abs(sprite.displayWidth / (sprite.width || 1)),
        (sprite.displayHeight / (sprite.height || 1)) * (1 + Math.sin(walkPulse) * 0.06),
      );
      // Keep flip from velocity
      if (body && body.velocity.x < -2) sprite.setFlipX(true);
      if (body && body.velocity.x > 2) sprite.setFlipX(false);
    } else {
      idle.resume();
    }
  };

  return {
    sync,
    destroy: () => idle.remove(),
  };
}

/** Floating sparkle / work particle near a point. */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color = 0xfff1a8) {
  for (let i = 0; i < 5; i++) {
    const p = scene.add.circle(x, y, 3 + Math.random() * 2, color, 0.9).setDepth(40);
    scene.tweens.add({
      targets: p,
      x: x + (Math.random() - 0.5) * 50,
      y: y - 20 - Math.random() * 40,
      alpha: 0,
      duration: 400 + Math.random() * 200,
      onComplete: () => p.destroy(),
    });
  }
}

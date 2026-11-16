import Phaser from "phaser";

export function reduceMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Soft ground shadow under a 2D character. */
export function addShadow(
  scene: Phaser.Scene,
  follow: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
  width = 48,
): { shadow: Phaser.GameObjects.Ellipse; sync: () => void } {
  const shadow = scene.add
    .ellipse(follow.x, follow.y + 36, width, 14, 0x000000, 0.3)
    .setDepth(follow.depth - 1);

  const sync = () => {
    shadow.setPosition(follow.x, follow.y + follow.displayHeight * 0.4);
    shadow.setVisible(follow.visible);
    const moving =
      "body" in follow &&
      follow.body &&
      Math.abs((follow.body as Phaser.Physics.Arcade.Body).velocity.x) +
        Math.abs((follow.body as Phaser.Physics.Arcade.Body).velocity.y) >
        12;
    shadow.setScale(moving ? 0.85 : 1, moving ? 0.75 : 1);
  };
  return { shadow, sync };
}

/** Idle breathe forever (skipped when prefers-reduced-motion). */
export function idleBreathe(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
) {
  if (reduceMotion()) return null;
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

/**
 * Walk bob + tilt + squash/stretch while velocity is non-zero.
 * Call dustCallback occasionally for footstep puffs (tiny FX only).
 */
export function walkHop(
  sprite: Phaser.Physics.Arcade.Sprite,
  dustCallback?: (x: number, y: number) => void,
): { sync: () => void } {
  let t = 0;
  const baseScaleX = Math.abs(sprite.scaleX) || 1;
  const baseScaleY = sprite.scaleY || 1;
  let dustCooldown = 0;
  const sync = () => {
    const body = sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const moving = Math.abs(vx) + Math.abs(vy) > 12;
    if (vx < -4) sprite.setFlipX(true);
    if (vx > 4) sprite.setFlipX(false);
    if (moving) {
      t += 0.48;
      const bob = Math.sin(t);
      // Squash/stretch + slight tilt while walking.
      sprite.setScale(baseScaleX * (1 - bob * 0.06), baseScaleY * (1 + bob * 0.08));
      sprite.setAngle(Phaser.Math.Clamp(vx * 0.025, -7, 7));
      dustCooldown -= 1;
      if (dustCooldown <= 0 && dustCallback && !reduceMotion()) {
        dustCallback(sprite.x, sprite.y + sprite.displayHeight * 0.35);
        dustCooldown = 8;
      }
    } else {
      sprite.setAngle(0);
      sprite.setScale(baseScaleX, baseScaleY);
    }
  };
  return { sync };
}

/** Tiny dust puff at footsteps (pixel-tiny FX ok). */
export function dustPuff(scene: Phaser.Scene, x: number, y: number) {
  if (reduceMotion()) return;
  for (let i = 0; i < 3; i++) {
    const p = scene.add
      .circle(x + (Math.random() - 0.5) * 10, y, 2 + Math.random() * 2, 0xc9b8a8, 0.7)
      .setDepth(18);
    scene.tweens.add({
      targets: p,
      x: p.x + (Math.random() - 0.5) * 18,
      y: y - 6 - Math.random() * 10,
      alpha: 0,
      scale: 0.3,
      duration: 280 + Math.random() * 120,
      onComplete: () => p.destroy(),
    });
  }
}

/** Cute spark burst for interactions (tiny FX). */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color = 0xfff1a8) {
  if (reduceMotion()) return;
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

/** Floating number (tiny FX). */
export function floatNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#3a3348",
) {
  if (reduceMotion()) {
    return;
  }
  const t = scene.add
    .text(x, y, text, {
      fontFamily: "Nunito, sans-serif",
      fontSize: "14px",
      color,
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(55);
  scene.tweens.add({
    targets: t,
    y: y - 36,
    alpha: 0,
    duration: 700,
    ease: "Cubic.out",
    onComplete: () => t.destroy(),
  });
}

/** Soft working bob at a station. */
export function workingLoop(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
) {
  if (reduceMotion()) return null;
  return scene.tweens.add({
    targets: sprite,
    angle: { from: -4, to: 4 },
    y: sprite.y - 3,
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
}

/** Panels glow when power is flowing. */
export function panelGlow(
  scene: Phaser.Scene,
  img: Phaser.GameObjects.Image,
  on: boolean,
): Phaser.Tweens.Tween | null {
  img.setTint(on ? 0xffe08a : 0xffffff);
  if (!on || reduceMotion()) return null;
  return scene.tweens.add({
    targets: img,
    alpha: { from: 0.85, to: 1 },
    duration: 700,
    yoyo: true,
    repeat: -1,
  });
}

/** Oxygen bubble stream. */
export function oxygenBubbles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  on: boolean,
): Phaser.Time.TimerEvent | null {
  if (!on || reduceMotion()) return null;
  return scene.time.addEvent({
    delay: 420,
    loop: true,
    callback: () => {
      const b = scene.add
        .circle(x + (Math.random() - 0.5) * 12, y, 3 + Math.random() * 2, 0xa8e6ff, 0.75)
        .setDepth(16);
      scene.tweens.add({
        targets: b,
        y: y - 40 - Math.random() * 20,
        alpha: 0,
        duration: 700,
        onComplete: () => b.destroy(),
      });
    },
  });
}

/** Tank fill level rectangle (0..1). */
export function setTankLevel(
  fill: Phaser.GameObjects.Rectangle,
  level01: number,
  maxH: number,
) {
  const h = Math.max(2, maxH * Phaser.Math.Clamp(level01, 0, 1));
  fill.setDisplaySize(fill.width, h);
  fill.setOrigin(0.5, 1);
}

/** Animate tank level toward a target. */
export function animateTankLevel(
  scene: Phaser.Scene,
  fill: Phaser.GameObjects.Rectangle,
  from01: number,
  to01: number,
  maxH: number,
) {
  if (reduceMotion()) {
    setTankLevel(fill, to01, maxH);
    return;
  }
  const state = { v: from01 };
  scene.tweens.add({
    targets: state,
    v: to01,
    duration: 500,
    onUpdate: () => setTankLevel(fill, state.v, maxH),
  });
}

/** Plants grow (tall) or droop (brown, tilted). No looping tweens. */
export function setPlantHealth(
  leaf: Phaser.GameObjects.Ellipse,
  healthy: boolean,
  _scene?: Phaser.Scene,
) {
  setPlantStage(leaf, healthy ? 3 : 0);
}

/**
 * Plant growth stages: 0 wilt · 1 watered sprout · 2 lit grow · 3 lush.
 */
export function setPlantStage(leaf: Phaser.GameObjects.Ellipse, stage: number) {
  const s = Phaser.Math.Clamp(Math.floor(stage), 0, 3);
  if (s === 0) {
    leaf.setFillStyle(0x8a6a3a);
    leaf.setScale(1, 0.55);
    leaf.setAngle(-16);
  } else if (s === 1) {
    leaf.setFillStyle(0x6a9a4a);
    leaf.setScale(0.85, 0.75);
    leaf.setAngle(-4);
  } else if (s === 2) {
    leaf.setFillStyle(0x3a9a4a);
    leaf.setScale(1, 0.95);
    leaf.setAngle(0);
  } else {
    leaf.setFillStyle(0x2f8a3a);
    leaf.setScale(1.1, 1.15);
    leaf.setAngle(0);
  }
}

/** Storm warning pulse on a banner (alpha only — scale shook the UI). */
export function stormWarningPulse(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
) {
  if (reduceMotion()) return null;
  return scene.tweens.add({
    targets: target,
    alpha: { from: 1, to: 0.55 },
    duration: 550,
    yoyo: true,
    repeat: -1,
    ease: "Sine.inOut",
  });
}

/** Bright wave + gentle camera shake on storm impact. */
export function stormImpactFx(scene: Phaser.Scene) {
  const { width: W, height: H } = scene.scale;
  if (!reduceMotion()) {
    scene.cameras.main.shake(280, 0.006);
  }
  const wave = scene.add
    .ellipse(W / 2, H * 0.35, 40, 20, 0xffe08a, 0.55)
    .setDepth(40);
  scene.tweens.add({
    targets: wave,
    scaleX: 18,
    scaleY: 10,
    alpha: 0,
    duration: reduceMotion() ? 200 : 700,
    ease: "Cubic.out",
    onComplete: () => wave.destroy(),
  });
}

/** Shelter door closes (rectangle slides down). */
export function shelterDoorClose(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w = 70,
  h = 90,
) {
  const door = scene.add
    .rectangle(x, y - h, w, h, 0x5a4a3a, 0.92)
    .setDepth(22)
    .setOrigin(0.5, 0);
  if (reduceMotion()) {
    door.setY(y - h * 0.15);
    scene.time.delayedCall(600, () => door.destroy());
    return door;
  }
  scene.tweens.add({
    targets: door,
    y: y - h * 0.15,
    duration: 420,
    ease: "Cubic.in",
    onComplete: () => {
      scene.time.delayedCall(500, () => door.destroy());
    },
  });
  return door;
}

/** Soft shield shimmer ring. */
export function shieldShimmer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  level: number,
) {
  if (level <= 0) return;
  const ring = scene.add
    .circle(x, y, 50 + level * 8, 0x7ec8ff, 0.15)
    .setStrokeStyle(2, 0xa8e6ff, 0.6)
    .setDepth(19);
  if (reduceMotion()) {
    scene.time.delayedCall(400, () => ring.destroy());
    return;
  }
  scene.tweens.add({
    targets: ring,
    scale: 1.25,
    alpha: 0,
    duration: 800,
    onComplete: () => ring.destroy(),
  });
}

/** Day/night crossfade overlay. */
export function dayNightCrossfade(scene: Phaser.Scene, toNight: boolean) {
  const { width: W, height: H } = scene.scale;
  const overlay = scene.add
    .rectangle(W / 2, H / 2, W, H, toNight ? 0x1a2238 : 0xffe8c8, 0)
    .setDepth(100);
  if (reduceMotion()) {
    overlay.setAlpha(0.15);
    scene.time.delayedCall(200, () => overlay.destroy());
    return;
  }
  scene.tweens.add({
    targets: overlay,
    alpha: 0.35,
    duration: 350,
    yoyo: true,
    onComplete: () => overlay.destroy(),
  });
}

/** Fade/slide camera when entering a room. */
export function fadeSlideIn(scene: Phaser.Scene, fromRight = true) {
  const cam = scene.cameras.main;
  if (reduceMotion()) {
    cam.fadeIn(120, 58, 51, 72);
    return;
  }
  cam.setAlpha(0);
  cam.setScroll(fromRight ? 40 : -40, 0);
  scene.tweens.add({
    targets: cam,
    alpha: 1,
    scrollX: 0,
    duration: 320,
    ease: "Cubic.out",
  });
}

/** Star twinkle (tiny FX). */
export function twinkleStars(
  scene: Phaser.Scene,
  stars: Phaser.GameObjects.Arc[],
) {
  if (reduceMotion()) return;
  for (const s of stars) {
    scene.tweens.add({
      targets: s,
      alpha: { from: 0.35, to: 0.95 },
      duration: 800 + Math.random() * 1200,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 800,
    });
  }
}

/** Soft painted moon ground (smooth 2D, not pixel). */
export function paintMoonGround(
  scene: Phaser.Scene,
  w: number,
  h: number,
  night: boolean,
  rng: () => number = Math.random,
) {
  const skyTop = night ? 0x2a3348 : 0x9eb6c9;
  const skyBot = night ? 0x4a4558 : 0xd5c4b0;
  const g = scene.add.graphics().setDepth(0);
  g.fillGradientStyle(skyTop, skyTop, skyBot, skyBot, 1);
  g.fillRect(0, 0, w, h * 0.45);

  const groundY = h * 0.42;
  g.fillStyle(night ? 0x5a5568 : 0xc9b8a8, 1);
  g.fillRect(0, groundY, w, h - groundY);

  for (let i = 0; i < 18; i++) {
    const cx = 40 + rng() * (w - 80);
    const cy = groundY + 40 + rng() * (h - groundY - 80);
    const r = 8 + rng() * 22;
    g.fillStyle(night ? 0x3a3548 : 0xb8a898, 0.5);
    g.fillCircle(cx, cy, r);
  }
}

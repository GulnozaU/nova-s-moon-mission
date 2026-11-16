import Phaser from "phaser";

/** Fast enough that compact rooms stay under ~3s door-to-door. */
const SPEED = 280;

export type ControlKeys = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  action: Phaser.Input.Keyboard.Key;
  actionAlt: Phaser.Input.Keyboard.Key;
};

export function makeKeys(scene: Phaser.Scene): ControlKeys | null {
  if (!scene.input.keyboard) return null;
  return {
    cursors: scene.input.keyboard.createCursorKeys(),
    wasd: {
      up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    },
    action: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    actionAlt: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
  };
}

export function applyMovement(
  player: Phaser.Physics.Arcade.Sprite,
  keys: ControlKeys | null,
  pad?: { x: number; y: number },
) {
  let vx = 0;
  let vy = 0;
  if (keys) {
    if (keys.cursors.left.isDown || keys.wasd.left.isDown) vx -= 1;
    if (keys.cursors.right.isDown || keys.wasd.right.isDown) vx += 1;
    if (keys.cursors.up.isDown || keys.wasd.up.isDown) vy -= 1;
    if (keys.cursors.down.isDown || keys.wasd.down.isDown) vy += 1;
  }
  if (pad) {
    vx += pad.x;
    vy += pad.y;
  }
  if (vx !== 0 || vy !== 0) {
    const len = Math.hypot(vx, vy) || 1;
    player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    if (vx < 0) player.setFlipX(true);
    if (vx > 0) player.setFlipX(false);
  } else {
    player.setVelocity(0, 0);
  }
}

export function actionJustPressed(keys: ControlKeys | null): boolean {
  if (!keys) return false;
  return (
    Phaser.Input.Keyboard.JustDown(keys.action) ||
    Phaser.Input.Keyboard.JustDown(keys.actionAlt)
  );
}

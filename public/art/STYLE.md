# Art style sheet (storybook pastel)

Target look: soft pastel storybook like `game_interface.png` — warm cream panels, sage/peach accents, rounded soft cutouts, Baloo 2 + Nunito.

## Palette (CSS + Phaser THEME)
- Ink `#3a3348`, cream `#fff8ef`, parchment `#f3ebe0`
- Sky `#9eb6c9`, sage `#8fa887`, peach `#e2b48a`, rose `#c98b7b`
- Buttons ≥48px, hover lift, pressed scale

## Audit (outline / lighting / white fringe)

| Asset | Note |
|-------|------|
| `cutouts/nova-astronaut-boy.png` | Clean rembg; matches suit white |
| `cutouts/greenhouse-dome.png` | Soft outline OK |
| `cutouts/habitat-dome.png` | Soft outline OK |
| `cutouts/stone-cottage-base.png` | Slightly heavier outline than habitat |
| `cutouts/solar-panels.png` | Cooler lighting than habitat set |
| `cutouts/satellite-dish-comms.png` | Clean |
| `cutouts/lunar-rover.png` | Slightly sharper edge than domes |
| `cutouts/earth-from-moon.png` | Photo-real wash (used faint) |
| `cutouts/water-tower.png` | OK |
| `cutouts/supply-crates.png` | OK |
| `cutouts/astronaut-girl-*.png` | Different character lighting vs Nova boy |
| Root `*.png` lucide stubs (zap, sun, …) | **0-byte placeholders** — do not use in play |
| JPG masters next to cutouts | Source photos; Phaser uses cutouts |

No file in `public/art` exceeded 300KB after cutout pass (largest ~269KB). No further compress required for the Stage 3 threshold.

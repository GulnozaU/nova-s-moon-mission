# References — Nova's Moon Mission

## Datasets and APIs

| Source | Use | Badge |
|--------|-----|-------|
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/donki/) / [DONKI-API](https://ccmc.gsfc.nasa.gov/DONKI-API/) flares + CMEs | Storm severity, CME speed → warning days, real flare/CME IDs and dates | LIVE / ARCHIVED |
| Archived DONKI pairs in `src/data/archived.json` | Fallback when live fetch fails (C/M/X from May 2024) | ARCHIVED |
| [NASA OSDR](https://osdr.nasa.gov/) studies | Greenhouse + radiation teaching; real study IDs and findings | LIVE / ARCHIVED / OSDR |
| Archived OSDR in `src/data/osdr-archive.json` | Fallback studies (OSD-476, OSD-37, OSD-520) | ARCHIVED |
| Site illumination notes in `src/data/sites.json` | Rim vs plain power story | ASSUMPTION / REFERENCE on fields |
| CME travel distance ~1 AU (`src/data/warning.ts`) | Warning hours from speed | REFERENCE scale; game rounding ASSUMPTION |

No NASA API keys are embedded in the client. Live calls use same-origin `/api/donki` and `/api/osdr` proxies when available; otherwise ARCHIVED badges appear.

## Libraries and packs

| Library / pack | Role | License (typical) |
|----------------|------|-------------------|
| React 19 | Shell UI + DOM HUD | MIT |
| Vite | Build / dev server | MIT |
| three + @react-three/fiber + @react-three/drei | Depth-painting world (default) + earlier low-poly prototype | MIT |
| Phaser 3 | Legacy 2D day loop (`?mode=2d`; branch `main-2d`) | MIT |
| Vitest | Engine, data, content, smoke, QA tests | MIT |
| TypeScript | Types throughout | Apache-2.0 |
| oxlint | Lint | MIT |
| Web Audio API | Procedural SFX (`src/audio/audio.ts`) — **no audio files** | Browser API |

## Offline depth models (no AI at runtime)

| Model | Used by | License | Output |
|-------|---------|---------|--------|
| [Depth Anything V2 Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf) | `scripts/generate-depth-maps.py --method da-v2` | **Apache-2.0** | `public/art/depth/*-depth.png` |
| [Intel DPT Hybrid MiDaS](https://huggingface.co/Intel/dpt-hybrid-midas) (optional) | `--method midas` | **MIT** (per HF card) | same folder |
| Geometric fallback | `--method geometric` | Original | only if torch unavailable |

Depth PNGs are **committed**. The browser only loads static textures — no model download in play.

## Depth-scene art and cutouts

| Asset | Tool / source | License note |
|-------|---------------|--------------|
| Room paintings (`public/art/*.jpeg`) | Soft pastel storybook paintings (AI-assisted + human edit) | Game art — not NASA photos |
| Depth maps (`public/art/depth/*-depth.png`) | Depth Anything V2 Small offline | Apache-2.0 model; maps are derived assets |
| PNG cutouts (`public/art/cutouts/*.png`) | AI image gen + rembg background removal | Original for this project |
| SVG machine proxies (`public/art/cutouts/*.svg`) | Hand-authored pastel proxies for missing machines | Original (CC0 for this hackathon) |
| Low-poly toon world (`src/world3d/`) | Original MeshToonMaterial placeholders | Original |

## Sound

**Sounds are made in code** — oscillators and filtered noise in `src/audio/audio.ts` (pick, drop, door, job done, storm alert/rumble, day jingle, etc.). Mute button persists in `localStorage` (`nova-mute`). Soft storm **loop** runs **only on storm days** and stops on mute, tab hide, or day change. No downloaded audio packs.

## NASA stills (Image and Video Library)

Credits from each record. No NASA logo or insignia. Do not imply endorsement.

| Slot | NASA ID | Credit |
|------|---------|--------|
| title | PIA13227 | NASA/GSFC/Arizona State University |
| storm | GSFC_20171208_Archive_e001164 | NASA/GSFC |
| southPole | PIA00001 | NASA/JPL/USGS |
| equatorial | PIA00224 | NASA/JPL |
| dust | AS17-145-22224 | NASA/JSC |
| greenhouse | S71-51318 | NASA/JSC |

Storm picture date (29 Mar 2014) may differ from the mission’s DONKI storm date; UI can label it as a past storm when dates do not match.

## Story / content

| File | Role |
|------|------|
| `src/content/STORY.md` | Prompt E script for review |
| `src/content/story.ts` | Typed beats (wiring pending full dialogue UI) |
| `src/content/schedule.ts` | Two DONKI storms on days 4\|5 and 8\|9 |
| `src/game/novaTalk.ts` | Short morning / consequence lines (≤25 words) |

## Use of AI

Cursor agents helped implement the simulation engine, depth world, Phaser day loop, tests, and documentation for the NASA Space Apps deadline. AI did **not** invent DONKI or OSDR records: flare IDs, CME IDs, study IDs, and image credits come from NASA sources or archived JSON. Game balance numbers are labeled ASSUMPTION (on-screen: “Game rule”). Storybook paintings and cutouts were AI-assisted; depth maps were produced offline with open-weight models (licenses above). Runtime play does not call generative AI.

## Limitations

- One difficulty mode; shelter cuts storm exposure (~30%, ASSUMPTION), not a full radiation transport model.
- Two seeded storms from real DONKI records; live weather can replace storm 1 when available.
- OSDR findings from ISS/Earth labs may not match the Moon (shown as a caution; OSD-476).
- CME warning uses ~1 AU travel time simplified to whole days.
- Decorative Moon art is fictional; NASA stills are real but may not match the exact storm date in play.
- Soft storm rumble is procedural mid-band noise — not a recorded storm.
- Browser game only — no login, no download, no client API keys.
- Full Prompt E dialogue UI (typewriter, goals panel, walk-up talk) is scripted in `STORY.md` / `story.ts` and may still be partially wired.

## Demo

`?demo=1` uses fixed seed `DEMO_SEED` (`20261115` in `useGameSession.ts`) so a ~30s video can show a reproducible storm schedule, morning talk, drag jobs, consequence beat, and end report.

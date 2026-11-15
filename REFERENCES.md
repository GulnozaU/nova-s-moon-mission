# References — Nova's Moon Mission

## Datasets and APIs

| Source | Use | Badge |
|--------|-----|-------|
| [NASA DONKI](https://ccmc.gsfc.nasa.gov/donki/) flares + CMEs | Storm severity, CME speed → warning days, real flare/CME IDs and dates | LIVE / ARCHIVED |
| Archived DONKI pairs in `src/data/archived.json` | Fallback when live fetch fails or is empty (C/M/X from May 2024) | ARCHIVED |
| [NASA OSDR](https://osdr.nasa.gov/) studies | Greenhouse + radiation teaching cards; real study IDs and findings | LIVE / ARCHIVED / OSDR |
| Archived OSDR in `src/data/osdr-archive.json` | Fallback studies (e.g. plant / radiation roles) | ARCHIVED |
| Site illumination notes in `src/data/sites.json` | Rim vs plain power story | ASSUMPTION / REFERENCE notes on each field |
| CME travel distance ~1 AU (`src/data/warning.ts`) | Warning hours from speed | REFERENCE scale; game rounding ASSUMPTION |

No NASA API keys are embedded in the client. Live calls go through same-origin `/api/donki` and `/api/osdr` proxies when available; otherwise ARCHIVED badges appear.

## Libraries

| Library | Role |
|---------|------|
| React 19 | Shell UI (welcome, training, site, end, legend) |
| Vite | Build / dev server |
| Phaser 3 | Persistent in-world day loop |
| Vitest | Engine, data, content tests |
| TypeScript | Types throughout |
| oxlint | Lint |

## NASA stills (Image and Video Library)

Credits are copied from each record. No NASA logo or insignia. Do not imply endorsement.

| Slot | NASA ID | Credit |
|------|---------|--------|
| title | PIA13227 | NASA/GSFC/Arizona State University |
| storm | GSFC_20171208_Archive_e001164 | NASA/GSFC |
| southPole | PIA00001 | NASA/JPL/USGS |
| equatorial | PIA00224 | NASA/JPL |
| dust | AS17-145-22224 | NASA/JSC |
| greenhouse | S71-51318 | NASA/JSC |

Storm picture date (29 Mar 2014) often differs from the mission’s DONKI storm date; the UI labels it **“A past storm”** when dates do not match.

## AI-generated / assisted art

| Asset | Tool | Note |
|-------|------|------|
| Storybook cutouts under `public/art/cutouts/` (Nova, habitat, greenhouse, panels, dish, rover, etc.) | Image generation + rembg background removal | Soft pastel storybook style; white fringes removed where possible |
| Layout / UI direction | Human + Cursor agent | CSS variables match Phaser THEME |

Exact generation prompts and vendor accounts may vary by teammate; treat cutouts as game art, not NASA photography.

## Use of AI

Cursor agents helped implement the simulation engine, Phaser day loop, tests, and documentation for the NASA Space Apps deadline. AI did not invent DONKI or OSDR records: flare IDs, CME IDs, study IDs, and image credits come from NASA sources or the project’s archived JSON. Game balance numbers are labeled ASSUMPTION (on-screen: “Game rule”).

## Limitations

- One difficulty mode; shelter cuts storm exposure to ~30% (ASSUMPTION), not a full radiation transport model.
- Two seeded storms land on days 4\|5 and 8\|9 from real DONKI records; live weather can replace storm 1 when available.
- OSDR findings from ISS/Earth labs may not match the Moon (shown as a caution).
- CME warning uses ~1 AU travel time simplified to whole days.
- Decorative Moon art is fictional; NASA stills are real but may not match the exact storm date in play.
- Browser game only — no login, no download, no client API keys.

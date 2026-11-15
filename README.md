# Nova's Moon Mission

NASA Space Apps 2026 — Junior Astronaut Mission Trainer. Run a Moon base for 10 days. Real NASA space weather decides when the storms hit.

## Stack

Vite + React + TypeScript. Pure simulation in `/src/engine`, NASA services in `/src/data`, screens in `/src/ui`, events and glossary in `/src/content`.

## Badge types

Every number in the game carries one of these provenance labels. Never fake data silently.

| Badge | Meaning |
| --- | --- |
| **LIVE** | Fetched from a NASA API at runtime (for example DONKI flares/CMEs, OSDR search). |
| **ARCHIVED** | Real NASA record stored at build time; used when live fetch fails or is empty. |
| **REFERENCE** | Taken from a published NASA/LRO (or similar) figure with a source link. |
| **ASSUMPTION** | Game number used only when no NASA value exists; always labeled as such. |
| **STORY** | Narrative framing for gameplay (not a measured NASA quantity). |

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## Spec

See [SPEC.md](./SPEC.md) (and the PDF in the repo root).

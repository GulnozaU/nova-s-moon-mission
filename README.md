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
| **OSDR** | Tied to a NASA Open Science Data Repository biology study (greenhouse). |

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## NASA data (DONKI) — no API key

Confirmed after the **30 Sept 2026** move (OpenAPI at https://ccmc.gsfc.nasa.gov/DONKI-API/v3/api-docs, linked from https://ccmc.gsfc.nasa.gov/tools/DONKI / https://ccmc.gsfc.nasa.gov/tools/API/):

- **Server base:** `https://ccmc.gsfc.nasa.gov/DONKI-API`
- **Get path:** `/get/{FLR|CME}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Client: `src/data/donki.ts` → `GET /api/donki` → 6-hour `localStorage` cache → ARCHIVED fallback
- Server: `api/donki.ts` (Vercel) + Vite dev middleware — **no key**

### Archived DONKI fallback IDs (real)

| Class | Flare ID | CME ID |
| --- | --- | --- |
| C5.3 | `2024-05-01T05:53:00-FLR-001` | `2024-05-01T06:36:00-CME-001` |
| M1.8 | `2024-05-01T22:26:00-FLR-001` | `2024-05-01T23:16:00-CME-001` |
| X1.6 | `2024-05-03T02:11:00-FLR-001` | `2024-05-03T02:48:00-CME-001` |

Fetched from CCMC DONKI for window 2024-05-01 … 2024-05-14. Paste replacements anytime if you prefer different real records.

## NASA data (OSDR) — no API key

Confirmed 2026-11-15:

| Endpoint | Status |
| --- | --- |
| `https://osdr.nasa.gov/osdr/data/search?term=plant` | Works (JSON). Filter to `Accession` starting with `OSD-` (raw `plant` hits include wastewater/MG-RAST noise). |
| `https://osdr.nasa.gov/osdr/data/osd/meta/{numericId}` e.g. `/476` | Works |
| `https://osdr.nasa.gov/osdr/data/osd/meta/OSD-476` | Returns **empty** `study: {}` — do not use the `OSD-` prefix on meta |
| Study page | `https://osdr.nasa.gov/bio/repo/data/studies/OSD-{id}` |
| Biological Data API (extra) | `https://visualization.osdr.nasa.gov/biodata/api/` |

### Archived OSDR study IDs (real)

| ID | Role | Organism |
| --- | --- | --- |
| `OSD-476` | greenhouse (Apollo lunar regolith) | Arabidopsis thaliana |
| `OSD-37` | greenhouse (ISS / SpaceX-4) | Arabidopsis thaliana |
| `OSD-520` | radiation (gamma / DNA methylation) | Arabidopsis thaliana |

Paste replacements anytime if you want different real studies.

## NASA pictures (Image and Video Library) — no API key

Confirmed against [NASA’s API PDF](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf):

| Endpoint | Status |
| --- | --- |
| `GET https://images-api.nasa.gov/search?q=…&media_type=image` | Works (no key) |
| `GET https://images-api.nasa.gov/asset/{nasa_id}` | Asset manifest (download URLs) |
| `GET https://images-api.nasa.gov/metadata/{nasa_id}` | Extra metadata |
| Item page | `https://images.nasa.gov/details-{nasa_id}` |

Run `npm run find-images` to print top candidates. Skip third-party copyright; never use the NASA logo/insignia. Chosen IDs go in `src/content/images.json` with files under `public/images/`.

### Bundled NASA stills (chosen for clearest on-topic context)

| Slot | NASA ID | Credit |
| --- | --- | --- |
| title | `PIA13227` | Image: NASA/GSFC/Arizona State University |
| storm | `GSFC_20171208_Archive_e001164` | Image: NASA/GSFC |
| southPole | `PIA00001` | Image: NASA/JPL/USGS |
| equatorial | `PIA00224` | Image: NASA/JPL |
| dust | `AS17-145-22224` | Image: NASA/JSC |
| greenhouse | `S71-51318` | Image: NASA/JSC |

Real data from NASA. This game is not made or endorsed by NASA.

## Spec

See [SPEC.md](./SPEC.md) (and the PDF in the repo root).

# Nova’s Moon Mission — Story Layer Script (Prompt E)

**Status:** Script for review. Data lives in `story.ts`. **Not wired** into the depth world UI yet.

**Rules used while writing**
- Dialogue: one or two sentences per beat, **≤12 words each**.
- Talking budget: keep each day’s spoken beats under **~25 seconds** (≈ 6–8 short lines + replies).
- **STORY** = invented base fiction. **OSDR** / **ARCHIVED** / **LIVE** = real NASA record with ID + date (or fetch at runtime).
- Every reply changes a resource, task, or later flag, and shows **benefit / cost**.
- Each day has **good** and **bad** state variants (`condition`).
- Each day ends with **Nova’s log** (one true lesson, one line).
- Failed mission → short **Mission review**, then one-tap retry.

**Speakers**
| ID | Name | Role |
|----|------|------|
| nova | Nova | Guide |
| sam | Sam | Engineer |
| mira | Mira | Plants |
| ana | Dr. Ana | Storm data |
| mc | Mission Control | Radio |

**Triggers:** `day_start` · `enter_place` · `after_job` · `after_event` · `after_storm` · `day_end` · `mission_fail`

**Places:** `surface` · `home` · `greenhouse` · `lab`

**Real sources cited in this script**
| Badge | Record | Date / note |
|-------|--------|-------------|
| OSDR | OSD-476 — Arabidopsis in Apollo lunar regolith; slow stressed growth | Study record on OSDR |
| OSDR | OSD-520 — multi-generation gamma / methylation (radiation teaching) | Study record on OSDR |
| ARCHIVED | DONKI FLR `2024-05-01T22:26:00-FLR-001` (M1.8) + CME `2024-05-01T23:16:00-CME-001` | 2024-05-01 |
| ARCHIVED | DONKI FLR `2024-05-03T02:11:00-FLR-001` (X1.6) + CME `2024-05-03T02:48:00-CME-001` | 2024-05-03 |
| LIVE | Prefer live DONKI FLR/CME when fetch succeeds | Runtime |
| TODO | Exact “radio delay” latency is game ASSUMPTION — not a measured lunar lag line | — |

Storm days in play are scheduled from these DONKI pairs (engine/content). Lines that name class/date must pull from the **scheduled storm’s** flare ID when wired.

---

## Day 1 — Teach one job per place

**Arc:** Radio → home cleaner → greenhouse water → lab analyzer → bed.  
**Goals:** (1) Chip the radio (2) Run water cleaner (3) Water one tray (4) Chip analyzer *(panel shows 3; bed is soft “then sleep”)*.

### Good state — `water >= 16 && oxygen >= 16`
| Beat | Trigger | Place | Speaker | Lines (≤12 words) | Badge | Task | Replies (benefit / cost) |
|------|---------|-------|---------|-------------------|-------|------|--------------------------|
| d1g-start | day_start | surface | Nova | “Hi! I am Nova.” / “Chip the yellow radio dish.” | STORY | radio_chip | A: “I’m ready” → unlock goal radio · **+focus** / **−none** · B: “Explain chips” → tip · **+clarity** / **−3s talk** |
| d1g-radio | after_job:radio | surface | Sam | “Nice signal.” / “Home next—water cleaner needs chips.” | STORY | enter_home | A: “Go home” → task enter_home · **+path** / **−none** |
| d1g-home | enter_place:home | home | Sam | “Drop chips until cleaner says ON.” / “Two chips. No free lunch.” | STORY | water_cleaner | A: “Fill it” → hint recycler · **+plan** / **−2⚡ planned** |
| d1g-clean | after_job:recycler | home | Mira | “Water saved!” / “Greenhouse next—drag drops on trays.” | STORY | gh_water | A: “To plants” → task greenhouse · **+path** / **−none** |
| d1g-gh | enter_place:greenhouse | greenhouse | Mira | “Tap water, then trays.” / “Light later—water first today.” | STORY | gh_water | A: “Water trays” · **+plants** / **−💧** |
| d1g-lab | enter_place:lab | lab | Ana | “Chip the analyzer with a sample.” / “Science is our score.” | STORY | analyzer | A: “Run it” · **+🔬** / **−1⚡** |
| d1g-log | day_end | home | Nova | **Log:** “Every job spends chips; nothing is free.” | STORY | — | — |

### Bad state — `water < 16 \|\| oxygen < 16`
| Beat | Trigger | Speaker | Lines | Badge | Notes |
|------|---------|---------|-------|-------|-------|
| d1b-start | day_start | Nova | “Tanks look low already.” / “Still—chip the radio first.” | STORY | Same task chain; Mira/Sam stress urgency |
| d1b-home | enter_place:home | Sam | “Cleaner first. We cannot waste drops.” / “Two chips. Please.” | STORY | |
| d1b-log | day_end | Nova | **Log:** “Low tanks mean life support comes before science.” | STORY | |

**Consequence beat (after bed):** use engine deltas; Nova line from `consequenceNovaLine` (already ≤25 words).

---

## Day 2 — Water + greenhouse (OSD-476)

**Arc:** Cleaner, trays, grow light; Mira teaches Moon-soil finding.  
**Goals:** (1) Water cleaner ON (2) Water 2 trays (3) Grow light ON.

### Good — `water >= 14 && recycler planned or on`
| Beat | Trigger | Speaker | Lines | Badge | Source |
|------|---------|---------|-------|-------|--------|
| d2g-start | day_start | Mira | “Day two: plants need us.” / “Water cleaner, then trays.” | STORY | |
| d2g-osdr | enter_place:greenhouse | Mira | “OSD-476 grew plants in Moon soil.” / “They grew slowly and looked stressed.” | **OSDR** | OSD-476; finding paraphrased from study record |
| d2g-osdr2 | after_job:gh_tray | Mira | “Results may differ on our base.” / “Still—water and light help.” | **OSDR** + STORY | Real caveat from study spirit; second line STORY |
| d2g-light | after_job:greenhouse | Sam | “Grow light costs a chip.” / “Worth it for air and science.” | STORY | |
| d2g-replies (start) | | | | | A: “Help plants” → `greenhouse` task · **+O₂/🔬 path** / **−⚡💧** · B: “Save water” → skip light task · **+💧** / **−plant science** |
| d2g-log | day_end | Nova | **Log:** “Moon soil grew plants, but slowly (OSD-476).” | **OSDR** | |

### Bad — `water < 14`
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d2b-start | Nova | “Water is tight.” / “Cleaner on—skip extra trays if needed.” | STORY |
| d2b-mira | Mira | “OSD-476: lunar soil was hard on plants.” / “We cannot waste drops today.” | **OSDR** |
| d2b-reply | | A: “Cleaner only” · **+💧 save** / **−plant job** · B: “One tray only” · **+small grow** / **−1💧** |
| d2b-log | Nova | **Log:** “When water is low, cleaner beats extra plants.” | STORY |

---

## Day 3 — Real storm on the lab screen

**Arc:** Power radio; visit lab storm monitor; Ana reads DONKI.  
**Goals:** (1) Radio ON (2) Open storm monitor (3) Read warning days.

### Good — `commsYesterday \|\| comms today`
| Beat | Trigger | Speaker | Lines | Badge | Source |
|------|---------|---------|-------|-------|--------|
| d3g-start | day_start | Ana | “Lab screen shows a real Sun flare.” / “Walk over. I will read it.” | STORY | |
| d3g-lab | enter_place:lab | Ana | “DONKI logged this flare and CME.” / “Class and date are NASA’s.” | **ARCHIVED** or **LIVE** | Pull `flrID`, `classType`, `beginTime` from scheduled/live weather |
| d3g-warn | after_job:storm_monitor | MC | “Warning days follow CME speed.” / “Keep radio chipped tomorrow.” | **REFERENCE**/ASSUMPTION map | Engine `warningFromCmeSpeed`; badge ASSUMPTION for game days |
| d3g-example | (variant line if archived M) | Ana | “Example on file: M1.8 on 2024-05-01.” / “ID ends FLR-001 that day.” | **ARCHIVED** | `2024-05-01T22:26:00-FLR-001` |
| d3g-replies | day_start | | A: “Chip radio” · **+warnings later** / **−1⚡** · B: “Study screen first” · **+info** / **−delay radio** |
| d3g-log | day_end | Nova | **Log:** “Real DONKI flares set our storm clock.” | **ARCHIVED**/LIVE | |

### Bad — `!commsYesterday && !comms`
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d3b-start | MC | “…” / *(static)* “We cannot reach you.” | STORY |
| d3b-ana | Ana | “No radio yesterday—no warning banner.” / “Chip the dish today.” | STORY |
| d3b-lab | Ana | “Screen still shows NASA’s flare picture.” / “Without radio, we guess late.” | **LIVE**/ARCHIVED picture + STORY |
| d3b-log | Nova | **Log:** “Warnings only come if radio had chips yesterday.” | STORY (rule) / engine truth |

---

## Day 4–5 — Storm 1 and shelter

*Schedule picks storm 1 from DONKI (often M-class window). Wire lines to that day’s `event.donkiFlareId` + `eventDate`.*

### Day 4 — Warning / prep (good: `alerts.length > 0 && commsYesterday`)
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d4g-start | MC | “Storm in a few days.” / “Build shields. Keep radio on.” | STORY + alert from DONKI timing |
| d4g-sam | Sam | “Crates on the shield frame.” / “Each layer cuts storm sting.” | STORY |
| d4g-replies | | A: “Build shield” · **+🛡️** / **−2📦** · B: “Bank chips” · **+battery** / **−shield** |
| d4g-log | Nova | **Log:** “Shields and radio are storm homework.” | STORY |

### Day 4 — Bad (`!commsYesterday`)
| Beat | Speaker | Lines |
|------|---------|-------|
| d4b-start | Nova | “Sky feels quiet—too quiet.” / “We missed Mission Control.” |
| d4b-ana | Ana | “Chip radio now.” / “Tomorrow may already be late.” |
| d4b-log | Nova | **Log:** “Missed radio means missed storm homework.” |

### Day 5 — Storm day (good: `stormSeverity` set, crew can shelter)
| Beat | Trigger | Speaker | Lines | Badge |
|------|---------|---------|-------|-------|
| d5g-start | day_start | MC | “Storm day. Shelter the crew.” / “Drag Sam, Mira, Ana home.” | STORY |
| d5g-ana | after_event | Ana | “This flare is a real DONKI record.” / “Date and ID are on the card.” | **ARCHIVED**/LIVE | Use storm event fields |
| d5g-sam | enter_place:home | Sam | “Hatch is open.” / “Anyone outside takes more risk.” | STORY |
| d5g-replies | | A: “Shelter all” · **−exposure** / **−outdoor 🔬** · B: “One science walk” · **+🔬** / **+⚠** |
| d5g-storm | after_storm | Mira | “That shook the trays.” / “We made it—check tanks.” | STORY |
| d5g-log | day_end | Nova | **Log:** “Shelter and shields cut storm exposure.” | STORY + engine |

### Day 5 — Bad (few sheltered)
| Beat | Speaker | Lines |
|------|---------|-------|
| d5b-start | Nova | “Storm hits hard if we stay out.” / “Drag every portrait home!” |
| d5b-after | Sam | “Exposure climbed.” / “Tomorrow we repair.” |
| d5b-log | Nova | **Log:** “Crew left outside takes the storm’s hit.” |

---

## Day 6 — Repairs and earlier costs

**Arc:** Delayed costs / clogged filter / materials; Sam leads repairs.  
**Goals:** (1) Clean filter or rebuild shield (2) Life support ON (3) Check materials.

### Good — `materials >= 2 && exposure < 35`
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d6g-start | Sam | “Repair day.” / “Yesterday’s choices still cost us.” | STORY |
| d6g-filter | enter_place:home | Sam | “If the filter clogged, spend material.” / “One chip plus one crate.” | STORY / ASSUMPTION costs |
| d6g-replies | | A: “Clean filter” · **+💧 efficiency** / **−1📦 −1⚡** · B: “Build shield” · **+🛡️** / **−2📦** |
| d6g-mira | enter_place:greenhouse | Mira | “Trays look tired.” / “Water if we can spare it.” | STORY |
| d6g-log | Nova | **Log:** “Some costs land after the choice day.” | STORY |

### Bad — `materials < 2 \|\| exposure >= 35`
| Beat | Speaker | Lines |
|------|---------|-------|
| d6b-start | Sam | “Parts are short.” / “Life support first—science later.” |
| d6b-ana | Ana | “Exposure is high.” / “No risky walks today.” |
| d6b-replies | | A: “Air + cleaner” · **+O₂ +💧** / **−⚡** · B: “Rest crew” · **−⚠ growth** / **−🔬** |
| d6b-log | Nova | **Log:** “Repairs beat science when parts and risk run thin.” |

---

## Day 7 — Rover trip and radio delay

**Arc:** Rover samples; MC explains delay.  
**Goals:** (1) Chip rover (2) Load lab rack (3) Keep radio ON.

### Good — `battery + free chips >= 3`
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d7g-start | Sam | “Rover day.” / “Chip it—samples come back soon.” | STORY |
| d7g-mc | after_job:rover | MC | “Message delay is part of distance.” / “We still need your radio on.” | **TODO** exact lag · STORY framing |
| d7g-ana | enter_place:lab | Ana | “Rack the samples.” / “Then chip the analyzer.” | STORY |
| d7g-replies | | A: “Send rover” · **+samples/🔬** / **−1⚡ +⚠ outside** · B: “Radio only” · **+warnings** / **−samples** |
| d7g-log | Nova | **Log:** “Rover science costs power and a little risk.” | STORY |

### Bad — low power
| Beat | Speaker | Lines |
|------|---------|-------|
| d7b-start | Nova | “Few chips today.” / “Radio before rover if storms loom.” |
| d7b-mc | MC | “We hate silence.” / “One chip on the dish, please.” |
| d7b-log | Nova | **Log:** “When power is short, radio can beat the rover.” |

---

## Day 8–9 — Storm 2 payoff

*Second DONKI storm (often stronger / X-class archive). Cite scheduled event.*

### Day 8 — Prep / warning
| State | Speaker | Lines | Badge |
|-------|---------|-------|-------|
| Good (alert+comms) | MC | “Second storm window.” / “Thicker shields if you can.” | STORY + DONKI schedule |
| | Ana | “X-class example on file: 2024-05-03.” / “Flare ID FLR-001 that morning.” | **ARCHIVED** `2024-05-03T02:11:00-FLR-001` |
| Bad (no comms) | Ana | “No call came.” / “We fly quieter—and blinder.” | STORY |
| Log good | Nova | **Log:** “Second storms punish thin shields.” | STORY |
| Log bad | Nova | **Log:** “No radio means the second storm surprises us.” | STORY |

**Replies (day 8):** A: “Shield + radio” · **+🛡️ +warn** / **−⚡ −📦** · B: “Science push” · **+🔬** / **+⚠ risk**

### Day 9 — Storm 2 hit
| State | Speaker | Lines | Badge |
|-------|---------|-------|-------|
| Good shelter | MC | “All hands inside!” / “Shields will help.” | STORY |
| | Ana | “This CME is from NASA’s catalog.” / “Match the ID on our card.” | **ARCHIVED**/LIVE |
| | Mira | “Plants hate this light.” / “We hold the trays steady.” | STORY |
| Bad exposed | Sam | “Someone is still outside!” / “Exposure is spiking!” | STORY |
| after_storm good | Ana | “OSD-520 studies radiation on plants.” / “Storms are why we care.” | **OSDR** OSD-520 |
| Log | Nova | **Log:** “Big storms reward shelter and shield layers.” | STORY + engine |

**Replies (day 9):** A: “Shelter 3/3” · **−⚠** / **−outdoor jobs** · B: “Leave one out for science” · **+🔬** / **+⚠**

---

## Day 10 — Review, rank, lessons

**Goals:** (1) Life support ON (2) Optional last science (3) Bed / debrief.

### Good — `science >= target && water > 0 && oxygen > 0`
| Beat | Speaker | Lines | Badge |
|------|---------|-------|-------|
| d10g-start | Nova | “Last day.” / “We review what NASA taught us.” | STORY |
| d10g-mira | Mira | “OSD-476: Moon soil grew stressed plants.” / “We watered anyway.” | **OSDR** |
| d10g-ana | Ana | “DONKI flares timed our storms.” / “Real dates. Real IDs.” | **ARCHIVED**/LIVE |
| d10g-sam | Sam | “Chips, shields, shelter.” / “That was the craft.” | STORY |
| d10g-replies | | A: “Safe finish” · **+survive** / **−last 🔬** · B: “Last sample” · **+🔬** / **−⚡ +small ⚠** |
| d10g-log | Nova | **Log:** “We finish by naming what was real.” | STORY |

### Bad — low science or critical resources
| Beat | Speaker | Lines |
|------|---------|-------|
| d10b-start | Nova | “We are short on science—or tanks.” / “Choose carefully.” |
| d10b-mc | MC | “Rank comes from survival and science.” / “Try a clean last plan.” |
| d10b-log | Nova | **Log:** “A hard last day still teaches the trade-offs.” |

**Rank line (UI, after bed):** pull from engine win/lose — STORY framing around real science target ASSUMPTION.

---

## Mission fail — Mission review (then one-tap retry)

Triggered when `lost === true` (water/oxygen/exposure).

| Order | Speaker | Lines | Badge |
|-------|---------|-------|-------|
| 1 | Nova | “We lost the base today.” / “Listen—then tap Retry.” | STORY |
| 2 | Sam | “Life support ran out—or storm won.” / “Shields and shelter matter.” | STORY |
| 3 | Mira | “Plants cannot drink empty tanks.” / “Cleaner earlier next run.” | STORY |
| 4 | Ana | “Check DONKI dates next time.” / “Radio yesterday unlocks warnings.” | STORY + engine rule |
| 5 | MC | “Retry when ready.” / “Same Moon. New choices.” | STORY |

**UI:** one button **Retry** → `replay()` / new seed. No scroll. ≤25 words on screen (show one speaker at a time).

---

## Today’s goals — per day (2–3 tasks)

| Day | Tasks (ids) |
|-----|-------------|
| 1 | `radio_chip`, `water_cleaner`, `analyzer` *(gh water as stretch / arrow)* |
| 2 | `water_cleaner`, `gh_water`, `grow_light` |
| 3 | `radio_chip`, `storm_monitor`, `read_warning` |
| 4 | `radio_chip`, `build_shield`, `bank_or_prep` |
| 5 | `shelter_sam`, `shelter_mira`, `shelter_ana` |
| 6 | `life_support`, `repair_filter_or_shield`, `check_materials` |
| 7 | `rover_trip`, `lab_samples`, `radio_chip` |
| 8 | `radio_chip`, `build_shield`, `life_support` |
| 9 | `shelter_all`, `no_risky_walk`, `life_support` |
| 10 | `life_support`, `optional_science`, `nova_log` |

Glowing arrows: request via `?` replay or “Show goal” → point at interactive id / place door.

---

## Wiring checklist (after you approve this script)

1. `story.ts` types + `STORY_BEATS` / `STORY_GOALS` / `MISSION_REVIEW` — **drafted with this doc**
2. Dialogue box (portrait, name, typewriter, Skip, `?`) — **not built**
3. Walk-to-player talk staging — **not built**
4. Today’s goals panel + tick + arrows — **not built**
5. Condition resolver reading `GameState` + decisions + alerts — **not built**
6. Reply → patch decisions / flags / tasks — **not built**
7. Day-end Nova log UI — **not built**
8. Fail review → retry — **not built**
9. Replace / merge current `MorningBriefing` + `storyLayer.ts` soft beats — **pending your OK**

---

## Review questions for you

1. Keep Day 1 to **three** goal ticks (radio, cleaner, analyzer) or show all four jobs?
2. Should Ana’s Day 3 lines always prefer **LIVE** DONKI when fetch works, with archived M1.8 as fallback example only?
3. OK that radio-delay Day 7 stays **TODO** for exact seconds and uses STORY for the talk?
4. Any speaker rename (Dr. Ana vs Ana) for kid UI?

/**
 * Prompt E story layer — data only.
 * Human-readable script: ./STORY.md (review before wiring UI).
 *
 * NOT wired into DepthWorldPlay / Phaser yet.
 */

import type { SourceBadge } from "../types";
import type { DayDecisions } from "../engine/types";
import type { GameState } from "../types";
import type { StormAlert } from "./schedule";
import type { Event } from "../types";

export type StorySpeakerId = "nova" | "sam" | "mira" | "ana" | "mc";

export type StoryTrigger =
  | "day_start"
  | "enter_place"
  | "after_job"
  | "after_event"
  | "after_storm"
  | "day_end"
  | "mission_fail";

export type StoryPlace = "surface" | "home" | "greenhouse" | "lab" | "any";

export type StoryConditionId =
  | "always"
  | "good_resources"
  | "bad_resources"
  | "low_water"
  | "ok_water"
  | "comms_ok"
  | "comms_dark"
  | "storm_alert"
  | "storm_today"
  | "sheltered_good"
  | "sheltered_bad"
  | "materials_ok"
  | "materials_low"
  | "power_ok"
  | "power_low"
  | "science_ok"
  | "science_low"
  | "mission_lost";

export type StoryReply = {
  id: string;
  label: string;
  /** ≤12 words. */
  benefit: string;
  /** ≤12 words. */
  cost: string;
  /** Applied when picked (engine decisions and/or story flags). */
  patch?: Partial<DayDecisions>;
  /** Soft flags for later beats / goals. */
  flags?: Record<string, boolean | number | string>;
  /** Mark a goal done or unlock. */
  completeTask?: string;
  unlockTask?: string;
};

export type StoryTask = {
  id: string;
  label: string;
  place?: StoryPlace;
  /** Interactive / job id to glow toward. */
  arrowTarget?: string;
};

export type StoryBeat = {
  id: string;
  day: number | "fail";
  trigger: StoryTrigger;
  /** Optional place gate for enter_place / after_job. */
  place?: StoryPlace;
  /** Optional job id for after_job. */
  jobId?: string;
  speaker: StorySpeakerId;
  portrait: string;
  /** One or two sentences, each ≤12 words. */
  lines: [string] | [string, string];
  condition: StoryConditionId;
  replies?: StoryReply[];
  task?: string;
  badge: SourceBadge;
  /** Optional real record pointer for UI “How do we know?” */
  sourceRef?: {
    kind: "OSDR" | "DONKI" | "TODO";
    id: string;
    date?: string;
    note?: string;
  };
  /** Day-end Nova log (one true lesson). */
  novaLog?: boolean;
};

export type StoryDayGoals = {
  day: number;
  tasks: StoryTask[];
};

export const STORY_SPEAKERS: Record<
  StorySpeakerId,
  { name: string; role: string; portrait: string }
> = {
  nova: {
    name: "Nova",
    role: "Guide",
    portrait: "/art/cutouts/nova-astronaut-boy.png",
  },
  sam: {
    name: "Sam",
    role: "Engineer",
    portrait: "/art/cutouts/astronaut-girl-with-helmet.png",
  },
  mira: {
    name: "Mira",
    role: "Plants",
    portrait: "/art/cutouts/astronaut-girl-with-glasses.png",
  },
  ana: {
    name: "Dr. Ana",
    role: "Storm data",
    portrait: "/art/cutouts/astronaut-girl-with-helmet.png",
  },
  mc: {
    name: "Mission Control",
    role: "Radio",
    portrait: "/art/cutouts/satellite-dish-comms.png",
  },
};

export const STORY_GOALS: StoryDayGoals[] = [
  {
    day: 1,
    tasks: [
      { id: "radio_chip", label: "Chip the radio", place: "surface", arrowTarget: "surface_radio" },
      { id: "water_cleaner", label: "Run water cleaner", place: "home", arrowTarget: "home_recycler" },
      { id: "analyzer", label: "Chip the analyzer", place: "lab", arrowTarget: "lab_analyzer" },
    ],
  },
  {
    day: 2,
    tasks: [
      { id: "water_cleaner", label: "Water cleaner ON", place: "home", arrowTarget: "home_recycler" },
      { id: "gh_water", label: "Water plant trays", place: "greenhouse", arrowTarget: "gh_tray_0" },
      { id: "grow_light", label: "Grow light ON", place: "greenhouse", arrowTarget: "gh_light" },
    ],
  },
  {
    day: 3,
    tasks: [
      { id: "radio_chip", label: "Radio ON", place: "surface", arrowTarget: "surface_radio" },
      { id: "storm_monitor", label: "Open storm monitor", place: "lab", arrowTarget: "lab_storm" },
      { id: "read_warning", label: "Read warning days", place: "lab", arrowTarget: "lab_storm" },
    ],
  },
  {
    day: 4,
    tasks: [
      { id: "radio_chip", label: "Keep radio ON", place: "surface", arrowTarget: "surface_radio" },
      { id: "build_shield", label: "Build a shield layer", place: "surface", arrowTarget: "surface_shield" },
      { id: "bank_or_prep", label: "Bank chips or prep home", place: "any" },
    ],
  },
  {
    day: 5,
    tasks: [
      { id: "shelter_sam", label: "Shelter Sam", place: "home", arrowTarget: "home_shelter" },
      { id: "shelter_mira", label: "Shelter Mira", place: "home", arrowTarget: "home_shelter" },
      { id: "shelter_ana", label: "Shelter Dr. Ana", place: "home", arrowTarget: "home_shelter" },
    ],
  },
  {
    day: 6,
    tasks: [
      { id: "life_support", label: "Cleaner + air maker", place: "home", arrowTarget: "home_recycler" },
      { id: "repair_filter_or_shield", label: "Repair filter or shield", place: "surface", arrowTarget: "surface_shield" },
      { id: "check_materials", label: "Check materials locker", place: "home", arrowTarget: "home_locker" },
    ],
  },
  {
    day: 7,
    tasks: [
      { id: "rover_trip", label: "Send the rover", place: "surface", arrowTarget: "surface_rover" },
      { id: "lab_samples", label: "Load lab samples", place: "lab", arrowTarget: "lab_rack" },
      { id: "radio_chip", label: "Radio ON", place: "surface", arrowTarget: "surface_radio" },
    ],
  },
  {
    day: 8,
    tasks: [
      { id: "radio_chip", label: "Radio ON", place: "surface", arrowTarget: "surface_radio" },
      { id: "build_shield", label: "Thicker shield", place: "surface", arrowTarget: "surface_shield" },
      { id: "life_support", label: "Life support ON", place: "home", arrowTarget: "home_air" },
    ],
  },
  {
    day: 9,
    tasks: [
      { id: "shelter_all", label: "Shelter all three", place: "home", arrowTarget: "home_shelter" },
      { id: "no_risky_walk", label: "Skip risky science walk", place: "any" },
      { id: "life_support", label: "Life support ON", place: "home", arrowTarget: "home_recycler" },
    ],
  },
  {
    day: 10,
    tasks: [
      { id: "life_support", label: "Life support ON", place: "home", arrowTarget: "home_recycler" },
      { id: "optional_science", label: "Optional last science", place: "lab", arrowTarget: "lab_analyzer" },
      { id: "nova_log", label: "Hear Nova’s log", place: "home", arrowTarget: "home_bunk" },
    ],
  },
];

/** Full beat table — mirrors STORY.md. UI wiring comes after review. */
export const STORY_BEATS: StoryBeat[] = [
  // —— Day 1 good ——
  {
    id: "d1g-start",
    day: 1,
    trigger: "day_start",
    place: "surface",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Hi! I am Nova.", "Chip the yellow radio dish."],
    condition: "good_resources",
    task: "radio_chip",
    badge: "STORY",
    replies: [
      {
        id: "ready",
        label: "I'm ready",
        benefit: "Starts today's radio goal",
        cost: "None",
        unlockTask: "radio_chip",
      },
      {
        id: "explain",
        label: "Explain chips",
        benefit: "Extra tip",
        cost: "Uses talk time",
        flags: { tip_chips: true },
      },
    ],
  },
  {
    id: "d1g-radio",
    day: 1,
    trigger: "after_job",
    jobId: "surface_radio",
    place: "surface",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Nice signal.", "Home next—water cleaner needs chips."],
    condition: "good_resources",
    task: "water_cleaner",
    badge: "STORY",
    replies: [
      {
        id: "go_home",
        label: "Go home",
        benefit: "Points to Crew home",
        cost: "None",
        unlockTask: "water_cleaner",
        flags: { arrow: "surface_door_home" },
      },
    ],
  },
  {
    id: "d1g-home",
    day: 1,
    trigger: "enter_place",
    place: "home",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Drop chips until cleaner says ON.", "Two chips. No free lunch."],
    condition: "good_resources",
    task: "water_cleaner",
    badge: "STORY",
    replies: [
      {
        id: "fill",
        label: "Fill it",
        benefit: "Plans water savings",
        cost: "Spends two chips",
        patch: { recycler: true },
      },
    ],
  },
  {
    id: "d1g-log",
    day: 1,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Every job spends chips; nothing is free."],
    condition: "good_resources",
    badge: "STORY",
    novaLog: true,
  },
  // —— Day 1 bad ——
  {
    id: "d1b-start",
    day: 1,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Tanks look low already.", "Still—chip the radio first."],
    condition: "bad_resources",
    task: "radio_chip",
    badge: "STORY",
    replies: [
      {
        id: "ok",
        label: "Okay",
        benefit: "Keeps tutorial moving",
        cost: "None",
        unlockTask: "radio_chip",
      },
    ],
  },
  {
    id: "d1b-log",
    day: 1,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Low tanks mean life support comes before science."],
    condition: "bad_resources",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 2 ——
  {
    id: "d2g-start",
    day: 2,
    trigger: "day_start",
    speaker: "mira",
    portrait: STORY_SPEAKERS.mira.portrait,
    lines: ["Day two: plants need us.", "Water cleaner, then trays."],
    condition: "ok_water",
    badge: "STORY",
    replies: [
      {
        id: "help_plants",
        label: "Help plants",
        benefit: "Unlocks greenhouse path",
        cost: "Uses power and water",
        patch: { greenhouse: true },
        unlockTask: "gh_water",
      },
      {
        id: "save_water",
        label: "Save water",
        benefit: "Protects tanks",
        cost: "Skips plant science",
        patch: { greenhouse: false },
      },
    ],
  },
  {
    id: "d2g-osdr",
    day: 2,
    trigger: "enter_place",
    place: "greenhouse",
    speaker: "mira",
    portrait: STORY_SPEAKERS.mira.portrait,
    lines: [
      "OSD-476 grew plants in Moon soil.",
      "They grew slowly and looked stressed.",
    ],
    condition: "ok_water",
    badge: "OSDR",
    sourceRef: {
      kind: "OSDR",
      id: "OSD-476",
      note: "Arabidopsis in Apollo lunar regolith; stressed slow growth.",
    },
  },
  {
    id: "d2g-log",
    day: 2,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Moon soil grew plants, but slowly (OSD-476)."],
    condition: "ok_water",
    badge: "OSDR",
    sourceRef: { kind: "OSDR", id: "OSD-476" },
    novaLog: true,
  },
  {
    id: "d2b-start",
    day: 2,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Water is tight.", "Cleaner on—skip extra trays if needed."],
    condition: "low_water",
    badge: "STORY",
    replies: [
      {
        id: "cleaner_only",
        label: "Cleaner only",
        benefit: "Saves water",
        cost: "No plant bonus",
        patch: { recycler: true, greenhouse: false },
      },
      {
        id: "one_tray",
        label: "One tray only",
        benefit: "Small grow",
        cost: "Spends one water",
        unlockTask: "gh_water",
      },
    ],
  },
  {
    id: "d2b-log",
    day: 2,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["When water is low, cleaner beats extra plants."],
    condition: "low_water",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 3 ——
  {
    id: "d3g-start",
    day: 3,
    trigger: "day_start",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: ["Lab screen shows a real Sun flare.", "Walk over. I will read it."],
    condition: "comms_ok",
    badge: "STORY",
    replies: [
      {
        id: "chip_radio",
        label: "Chip radio",
        benefit: "Unlocks later warnings",
        cost: "One power chip",
        patch: { comms: true },
        completeTask: "radio_chip",
      },
      {
        id: "screen_first",
        label: "Study screen first",
        benefit: "Sees NASA picture",
        cost: "Delays radio",
        unlockTask: "storm_monitor",
      },
    ],
  },
  {
    id: "d3g-lab",
    day: 3,
    trigger: "enter_place",
    place: "lab",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: ["DONKI logged this flare and CME.", "Class and date are NASA's."],
    condition: "comms_ok",
    badge: "ARCHIVED",
    sourceRef: {
      kind: "DONKI",
      id: "2024-05-01T22:26:00-FLR-001",
      date: "2024-05-01",
      note: "Prefer LIVE flrID when fetch works.",
    },
    task: "storm_monitor",
  },
  {
    id: "d3g-log",
    day: 3,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Real DONKI flares set our storm clock."],
    condition: "comms_ok",
    badge: "ARCHIVED",
    novaLog: true,
  },
  {
    id: "d3b-start",
    day: 3,
    trigger: "day_start",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["We cannot reach you.", "Chip the dish today."],
    condition: "comms_dark",
    badge: "STORY",
    replies: [
      {
        id: "fix_radio",
        label: "Fix radio",
        benefit: "Restores Mission Control",
        cost: "One chip",
        patch: { comms: true },
      },
    ],
  },
  {
    id: "d3b-log",
    day: 3,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Warnings only come if radio had chips yesterday."],
    condition: "comms_dark",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 4 ——
  {
    id: "d4g-start",
    day: 4,
    trigger: "day_start",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["Storm in a few days.", "Build shields. Keep radio on."],
    condition: "storm_alert",
    badge: "STORY",
    replies: [
      {
        id: "shield",
        label: "Build shield",
        benefit: "Less storm sting",
        cost: "Two material crates",
        patch: { buildShield: true, comms: true },
      },
      {
        id: "bank",
        label: "Bank chips",
        benefit: "More battery tomorrow",
        cost: "No new shield",
        patch: { buildShield: false, comms: true },
      },
    ],
  },
  {
    id: "d4g-log",
    day: 4,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Shields and radio are storm homework."],
    condition: "storm_alert",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d4b-start",
    day: 4,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Sky feels quiet—too quiet.", "We missed Mission Control."],
    condition: "comms_dark",
    badge: "STORY",
    replies: [
      {
        id: "radio_now",
        label: "Chip radio now",
        benefit: "May unlock next warning",
        cost: "One chip",
        patch: { comms: true },
      },
    ],
  },
  {
    id: "d4b-log",
    day: 4,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Missed radio means missed storm homework."],
    condition: "comms_dark",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 5 ——
  {
    id: "d5g-start",
    day: 5,
    trigger: "day_start",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["Storm day. Shelter the crew.", "Drag Sam, Mira, Ana home."],
    condition: "storm_today",
    badge: "STORY",
    replies: [
      {
        id: "shelter_all",
        label: "Shelter all",
        benefit: "Cuts storm exposure",
        cost: "No outdoor science",
        patch: { shelteredCrewCount: 3, scienceLevel: 0 },
      },
      {
        id: "science_risk",
        label: "One science walk",
        benefit: "More science points",
        cost: "Higher storm risk",
        patch: { scienceLevel: 1, shelteredCrewCount: 2 },
      },
    ],
  },
  {
    id: "d5g-ana",
    day: 5,
    trigger: "after_event",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: ["This flare is a real DONKI record.", "Date and ID are on the card."],
    condition: "storm_today",
    badge: "ARCHIVED",
    sourceRef: {
      kind: "DONKI",
      id: "scheduled-storm-1",
      note: "Replace with event.donkiFlareId + eventDate at runtime.",
    },
  },
  {
    id: "d5g-log",
    day: 5,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Shelter and shields cut storm exposure."],
    condition: "sheltered_good",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d5b-log",
    day: 5,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Crew left outside takes the storm's hit."],
    condition: "sheltered_bad",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 6 ——
  {
    id: "d6g-start",
    day: 6,
    trigger: "day_start",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Repair day.", "Yesterday's choices still cost us."],
    condition: "materials_ok",
    badge: "STORY",
    replies: [
      {
        id: "filter",
        label: "Clean filter",
        benefit: "Better water efficiency",
        cost: "One material, one chip",
        patch: { cleanFilter: true },
      },
      {
        id: "shield",
        label: "Build shield",
        benefit: "Another shield layer",
        cost: "Two materials",
        patch: { buildShield: true },
      },
    ],
  },
  {
    id: "d6g-log",
    day: 6,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Some costs land after the choice day."],
    condition: "materials_ok",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d6b-start",
    day: 6,
    trigger: "day_start",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Parts are short.", "Life support first—science later."],
    condition: "materials_low",
    badge: "STORY",
    replies: [
      {
        id: "life",
        label: "Air + cleaner",
        benefit: "Protects water and air",
        cost: "Spends power chips",
        patch: { recycler: true, oxygenMaker: true },
      },
      {
        id: "rest",
        label: "Rest crew",
        benefit: "Slows exposure growth",
        cost: "No science today",
        patch: { scienceLevel: 0 },
      },
    ],
  },
  {
    id: "d6b-log",
    day: 6,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Repairs beat science when parts and risk run thin."],
    condition: "materials_low",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 7 ——
  {
    id: "d7g-start",
    day: 7,
    trigger: "day_start",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Rover day.", "Chip it—samples come back soon."],
    condition: "power_ok",
    badge: "STORY",
    replies: [
      {
        id: "rover",
        label: "Send rover",
        benefit: "Samples and science",
        cost: "Power and outdoor risk",
        patch: { scienceLevel: 1 },
        unlockTask: "rover_trip",
      },
      {
        id: "radio_only",
        label: "Radio only",
        benefit: "Keeps warnings",
        cost: "No new samples",
        patch: { comms: true, scienceLevel: 0 },
      },
    ],
  },
  {
    id: "d7g-mc",
    day: 7,
    trigger: "after_job",
    jobId: "surface_rover",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: [
      "Message delay is part of distance.",
      "We still need your radio on.",
    ],
    condition: "power_ok",
    badge: "STORY",
    sourceRef: {
      kind: "TODO",
      id: "radio-delay-seconds",
      note: "Exact Earth–Moon latency not scripted as a measured line yet.",
    },
  },
  {
    id: "d7g-log",
    day: 7,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Rover science costs power and a little risk."],
    condition: "power_ok",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d7b-start",
    day: 7,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Few chips today.", "Radio before rover if storms loom."],
    condition: "power_low",
    badge: "STORY",
    replies: [
      {
        id: "radio",
        label: "Chip radio",
        benefit: "Mission Control link",
        cost: "One chip",
        patch: { comms: true },
      },
    ],
  },
  {
    id: "d7b-log",
    day: 7,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["When power is short, radio can beat the rover."],
    condition: "power_low",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 8 ——
  {
    id: "d8g-start",
    day: 8,
    trigger: "day_start",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["Second storm window.", "Thicker shields if you can."],
    condition: "storm_alert",
    badge: "STORY",
    replies: [
      {
        id: "prep",
        label: "Shield + radio",
        benefit: "Safer for storm two",
        cost: "Power and materials",
        patch: { buildShield: true, comms: true },
      },
      {
        id: "push",
        label: "Science push",
        benefit: "More science now",
        cost: "Higher storm risk",
        patch: { scienceLevel: 1 },
      },
    ],
  },
  {
    id: "d8g-ana",
    day: 8,
    trigger: "enter_place",
    place: "lab",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: [
      "X-class example on file: 2024-05-03.",
      "Flare ID FLR-001 that morning.",
    ],
    condition: "storm_alert",
    badge: "ARCHIVED",
    sourceRef: {
      kind: "DONKI",
      id: "2024-05-03T02:11:00-FLR-001",
      date: "2024-05-03",
    },
  },
  {
    id: "d8g-log",
    day: 8,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Second storms punish thin shields."],
    condition: "storm_alert",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d8b-log",
    day: 8,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["No radio means the second storm surprises us."],
    condition: "comms_dark",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 9 ——
  {
    id: "d9g-start",
    day: 9,
    trigger: "day_start",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["All hands inside!", "Shields will help."],
    condition: "storm_today",
    badge: "STORY",
    replies: [
      {
        id: "shelter",
        label: "Shelter 3/3",
        benefit: "Lowest storm exposure",
        cost: "No outdoor jobs",
        patch: { shelteredCrewCount: 3, scienceLevel: 0 },
      },
      {
        id: "one_out",
        label: "Leave one out",
        benefit: "Some science",
        cost: "More exposure",
        patch: { shelteredCrewCount: 2, scienceLevel: 1 },
      },
    ],
  },
  {
    id: "d9g-osdr",
    day: 9,
    trigger: "after_storm",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: [
      "OSD-520 studies radiation on plants.",
      "Storms are why we care.",
    ],
    condition: "storm_today",
    badge: "OSDR",
    sourceRef: { kind: "OSDR", id: "OSD-520" },
  },
  {
    id: "d9g-log",
    day: 9,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Big storms reward shelter and shield layers."],
    condition: "sheltered_good",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d9b-log",
    day: 9,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Crew left outside takes the storm's hit."],
    condition: "sheltered_bad",
    badge: "STORY",
    novaLog: true,
  },

  // —— Day 10 ——
  {
    id: "d10g-start",
    day: 10,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["Last day.", "We review what NASA taught us."],
    condition: "science_ok",
    badge: "STORY",
    replies: [
      {
        id: "safe",
        label: "Safe finish",
        benefit: "Protects tanks",
        cost: "Skips last science",
        patch: { recycler: true, oxygenMaker: true, scienceLevel: 0 },
      },
      {
        id: "last_sample",
        label: "Last sample",
        benefit: "More science points",
        cost: "Power and small risk",
        patch: { scienceLevel: 1 },
      },
    ],
  },
  {
    id: "d10g-mira",
    day: 10,
    trigger: "enter_place",
    place: "greenhouse",
    speaker: "mira",
    portrait: STORY_SPEAKERS.mira.portrait,
    lines: [
      "OSD-476: Moon soil grew stressed plants.",
      "We watered anyway.",
    ],
    condition: "science_ok",
    badge: "OSDR",
    sourceRef: { kind: "OSDR", id: "OSD-476" },
  },
  {
    id: "d10g-log",
    day: 10,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["We finish by naming what was real."],
    condition: "science_ok",
    badge: "STORY",
    novaLog: true,
  },
  {
    id: "d10b-start",
    day: 10,
    trigger: "day_start",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["We are short on science—or tanks.", "Choose carefully."],
    condition: "science_low",
    badge: "STORY",
    replies: [
      {
        id: "life",
        label: "Save tanks",
        benefit: "Better survival odds",
        cost: "Less science",
        patch: { recycler: true, oxygenMaker: true },
      },
      {
        id: "push",
        label: "Push science",
        benefit: "Chase the score",
        cost: "Risks tanks",
        patch: { scienceLevel: 1 },
      },
    ],
  },
  {
    id: "d10b-log",
    day: 10,
    trigger: "day_end",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["A hard last day still teaches the trade-offs."],
    condition: "science_low",
    badge: "STORY",
    novaLog: true,
  },
];

/** Spoken mission review after a failed run — then one-tap retry. */
export const MISSION_REVIEW: StoryBeat[] = [
  {
    id: "fail-nova",
    day: "fail",
    trigger: "mission_fail",
    speaker: "nova",
    portrait: STORY_SPEAKERS.nova.portrait,
    lines: ["We lost the base today.", "Listen—then tap Retry."],
    condition: "mission_lost",
    badge: "STORY",
  },
  {
    id: "fail-sam",
    day: "fail",
    trigger: "mission_fail",
    speaker: "sam",
    portrait: STORY_SPEAKERS.sam.portrait,
    lines: ["Life support ran out—or storm won.", "Shields and shelter matter."],
    condition: "mission_lost",
    badge: "STORY",
  },
  {
    id: "fail-mira",
    day: "fail",
    trigger: "mission_fail",
    speaker: "mira",
    portrait: STORY_SPEAKERS.mira.portrait,
    lines: ["Plants cannot drink empty tanks.", "Cleaner earlier next run."],
    condition: "mission_lost",
    badge: "STORY",
  },
  {
    id: "fail-ana",
    day: "fail",
    trigger: "mission_fail",
    speaker: "ana",
    portrait: STORY_SPEAKERS.ana.portrait,
    lines: ["Check DONKI dates next time.", "Radio yesterday unlocks warnings."],
    condition: "mission_lost",
    badge: "STORY",
  },
  {
    id: "fail-mc",
    day: "fail",
    trigger: "mission_fail",
    speaker: "mc",
    portrait: STORY_SPEAKERS.mc.portrait,
    lines: ["Retry when ready.", "Same Moon. New choices."],
    condition: "mission_lost",
    badge: "STORY",
    replies: [
      {
        id: "retry",
        label: "Retry",
        benefit: "New mission attempt",
        cost: "Resets progress",
        flags: { retry: true },
      },
    ],
  },
];

export type StoryEvalContext = {
  state: GameState;
  decisions: DayDecisions;
  event: Event | null;
  alerts: StormAlert[];
  commsYesterday: boolean;
  shelteredCount: number;
  lost?: boolean;
  scienceTarget: number;
};

/** Pure condition helper for later wiring (not used by UI yet). */
export function storyConditionMet(
  id: StoryConditionId,
  ctx: StoryEvalContext,
): boolean {
  const { state, event, alerts, commsYesterday, shelteredCount, lost, scienceTarget } =
    ctx;
  switch (id) {
    case "always":
      return true;
    case "good_resources":
      return state.water >= 16 && state.oxygen >= 16;
    case "bad_resources":
      return state.water < 16 || state.oxygen < 16;
    case "low_water":
      return state.water < 14;
    case "ok_water":
      return state.water >= 14;
    case "comms_ok":
      return commsYesterday || Boolean(ctx.decisions.comms);
    case "comms_dark":
      return !commsYesterday && !ctx.decisions.comms;
    case "storm_alert":
      return alerts.length > 0 && commsYesterday;
    case "storm_today":
      return event?.stormSeverity !== undefined;
    case "sheltered_good":
      return shelteredCount >= 3;
    case "sheltered_bad":
      return shelteredCount < 3;
    case "materials_ok":
      return state.materials >= 2 && state.exposure < 35;
    case "materials_low":
      return state.materials < 2 || state.exposure >= 35;
    case "power_ok":
      return state.battery >= 2;
    case "power_low":
      return state.battery < 2;
    case "science_ok":
      return state.science >= scienceTarget && state.water > 0 && state.oxygen > 0;
    case "science_low":
      return state.science < scienceTarget || state.water <= 8 || state.oxygen <= 8;
    case "mission_lost":
      return Boolean(lost);
    default:
      return false;
  }
}

export function goalsForDay(day: number): StoryTask[] {
  return STORY_GOALS.find((g) => g.day === day)?.tasks ?? [];
}

export function beatsForDay(day: number): StoryBeat[] {
  return STORY_BEATS.filter((b) => b.day === day);
}

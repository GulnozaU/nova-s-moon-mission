import { useCallback, useMemo, useRef, useState } from "react";
import { audio } from "../audio/audio";
import {
  applyDay,
  availablePower,
  baseGeneration,
  createGame,
  MISSION_DAYS,
} from "../engine";
import type { ApplyDayResult, DayDecisions } from "../engine/types";
import { getOsdrStudy, getSpaceWeather, sites } from "../data";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { OsdrStudy } from "../data/osdrTypes";
import {
  scheduleMissionEvents,
  stormAlertsForDay,
  type MissionSchedule,
  type StormAlert,
} from "../content/schedule";
import type { Event, GameState, SiteId, SourceBadge } from "../types";
import { novaTrimSpeech, trimDecisionsToBudget } from "../game/trimBudget";
import { resetMissionGuide } from "../game/tutorial/session";
import { defaultDecisions } from "./powerMath";

export type Phase =
  | "welcome"
  | "training"
  | "site"
  | "loading"
  | "base"
  | "power"
  | "event"
  | "result"
  | "end"
  | "legend"
  | "error";

export type ResourceDelta = {
  key: string;
  label: string;
  before: number;
  after: number;
  why: string;
  badge: SourceBadge;
};

export type GameSession = {
  phase: Phase;
  trainingStep: number;
  seed: number;
  site: SiteId | null;
  state: GameState | null;
  weather: SpaceWeatherResult | null;
  greenhouseStudy: OsdrStudy | null;
  schedule: MissionSchedule | null;
  decisions: DayDecisions;
  todaysEvent: Event | null;
  lastResult: ApplyDayResult | null;
  lastChoice: "A" | "B" | null;
  lastDecisions: DayDecisions | null;
  deltas: ResourceDelta[];
  loadError: string | null;
  glossaryOpen: boolean;
  afterStormOpen: boolean;
  powerToday: number;
  generationToday: number;
  stormAlerts: StormAlert[];
  tomorrowHint: string;
  commsYesterday: boolean;
  novaLine: string;
  sheltering: boolean;
  setPhase: (p: Phase) => void;
  setTrainingStep: (n: number) => void;
  setDecisions: (d: DayDecisions | ((prev: DayDecisions) => DayDecisions)) => void;
  setGlossaryOpen: (v: boolean) => void;
  setAfterStormOpen: (v: boolean) => void;
  setNovaLine: (line: string) => void;
  setSheltering: (on: boolean) => void;
  startTraining: () => void;
  pickSite: (site: SiteId) => Promise<void>;
  retryLoad: () => Promise<void>;
  /** @deprecated dwell-circle loop — kept for bridge stubs */
  goPower: () => void;
  goEvent: () => void;
  chooseEvent: (choice: "A" | "B") => void;
  endDayFromWorld: () => ResourceDelta[];
  continueAfterResult: () => void;
  replay: () => void;
  openLegend: () => void;
  backFromLegend: () => void;
  siteRecords: typeof sites.sites;
  missionDays: number;
};

/** Fixed seed for ?demo=1 so a 30s video is reproducible. ASSUMPTION. */
export const DEMO_SEED = 20261115;

function newSeed(): number {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    if (q.get("demo") === "1") return DEMO_SEED;
  }
  return Math.floor(Math.random() * 1_000_000_000);
}

function whyFromNotes(
  notes: string[],
  needle: RegExp,
  fallback: string,
): string {
  const hit = notes.find((n) => needle.test(n));
  return hit ?? fallback;
}

function buildDeltas(
  before: GameState,
  result: ApplyDayResult,
): ResourceDelta[] {
  const after = result.state;
  const notes = result.dayLog.notes;
  const dWater = after.water - before.water;
  const dOxygen = after.oxygen - before.oxygen;
  const dBattery = after.battery - before.battery;
  const dMaterials = after.materials - before.materials;
  const dExposure = after.exposure - before.exposure;
  const dScience = after.science - before.science;

  const rows: ResourceDelta[] = [
    {
      key: "water",
      label: "Water",
      before: before.water,
      after: after.water,
      why: whyFromNotes(
        notes,
        /Water/i,
        dWater < 0
          ? `Water ${dWater}: tanks went down today.`
          : `Water +${dWater}: tanks went up today.`,
      ),
      badge: "ASSUMPTION",
    },
    {
      key: "oxygen",
      label: "Oxygen",
      before: before.oxygen,
      after: after.oxygen,
      why: whyFromNotes(
        notes,
        /Oxygen|air maker|breathed|crack|leak/i,
        dOxygen < 0
          ? `Oxygen ${dOxygen}: air went down.`
          : `Oxygen +${dOxygen}: air went up.`,
      ),
      badge: "ASSUMPTION",
    },
    {
      key: "battery",
      label: "Battery",
      before: before.battery,
      after: after.battery,
      why: whyFromNotes(
        notes,
        /Battery|power|panel|filter/i,
        dBattery < 0
          ? `Battery ${dBattery}: power chips were spent.`
          : `Battery +${dBattery}: leftover chips stored.`,
      ),
      badge: "ASSUMPTION",
    },
    {
      key: "materials",
      label: "Materials",
      before: before.materials,
      after: after.materials,
      why: whyFromNotes(
        notes,
        /material|shield|panel|filter|parts/i,
        dMaterials < 0
          ? `Materials ${dMaterials}: parts were used.`
          : `Materials +${dMaterials}: parts gained.`,
      ),
      badge: "ASSUMPTION",
    },
    {
      key: "exposure",
      label: "Crew safety risk",
      before: before.exposure,
      after: after.exposure,
      why: whyFromNotes(
        notes,
        /Crew risk|storm|outside|heat/i,
        dExposure > 0
          ? `Crew risk +${dExposure.toFixed(1)}: storm or time outside.`
          : `Crew risk ${dExposure.toFixed(1)}: rest helped a little.`,
      ),
      badge: "ASSUMPTION",
    },
    {
      key: "science",
      label: "Science",
      before: before.science,
      after: after.science,
      why: whyFromNotes(
        notes,
        /Science|Sheltered/i,
        dScience > 0
          ? `Science +${dScience}: work outside or plants.`
          : "Science unchanged: sheltered or no work outside.",
      ),
      badge: "ASSUMPTION",
    },
  ];
  return rows.filter((r) => r.before !== r.after);
}

export function useGameSession(): GameSession {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [trainingStep, setTrainingStep] = useState(0);
  const [seed, setSeed] = useState(newSeed);
  const [site, setSite] = useState<SiteId | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [rng, setRng] = useState<(() => number) | null>(null);
  const [weather, setWeather] = useState<SpaceWeatherResult | null>(null);
  const [greenhouseStudy, setGreenhouseStudy] = useState<OsdrStudy | null>(
    null,
  );
  const [schedule, setSchedule] = useState<MissionSchedule | null>(null);
  const [decisions, setDecisions] = useState<DayDecisions>(defaultDecisions);
  const [todaysEvent, setTodaysEvent] = useState<Event | null>(null);
  const [lastResult, setLastResult] = useState<ApplyDayResult | null>(null);
  const [lastChoice, setLastChoice] = useState<"A" | "B" | null>(null);
  const [lastDecisions, setLastDecisions] = useState<DayDecisions | null>(null);
  const [deltas, setDeltas] = useState<ResourceDelta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [afterStormOpen, setAfterStormOpen] = useState(false);
  const [legendReturn, setLegendReturn] = useState<Phase>("welcome");
  const [commsYesterday, setCommsYesterday] = useState(false);
  const [novaLine, setNovaLine] = useState(
    "Drag power chips onto machines. Drag Nova into bed to end the day.",
  );
  const [sheltering, setSheltering] = useState(false);
  const endingLock = useRef(false);

  const powerToday = useMemo(() => {
    if (!state) return 0;
    return availablePower(
      state.site,
      state.day,
      state.panelBonus,
      state.battery,
    );
  }, [state]);

  const generationToday = useMemo(() => {
    if (!state) return 0;
    return baseGeneration(state.site, state.day) + state.panelBonus;
  }, [state]);

  /** Warning only if the radio was on yesterday. */
  const stormAlerts = useMemo(() => {
    if (!schedule || !state) return [];
    return stormAlertsForDay(schedule, state.day, commsYesterday);
  }, [schedule, state, commsYesterday]);

  const tomorrowHint = useMemo(() => {
    if (!state) return "";
    if (state.water < 12) {
      return "Water is low. Turn on the cleaner or you may run out soon.";
    }
    if (state.oxygen < 10) {
      return "Air is low. Run the air maker tomorrow.";
    }
    if (state.exposure > 30) {
      return "Crew risk is high. Shelter if a storm comes.";
    }
    if ((state.recyclerEfficiency ?? 1) < 1) {
      return "The water filter is clogged. Clean it with 1 material.";
    }
    if (schedule) {
      const nextStorm = schedule.storms.find((s) => s.day > state.day);
      if (nextStorm) {
        const n = nextStorm.day - state.day;
        return `A storm may hit in ${n} day${n === 1 ? "" : "s"}. Keep Comms on.`;
      }
    }
    return "Plan tomorrow's power. Every job helps and costs.";
  }, [state, schedule]);

  const bootstrapMission = useCallback(async (chosen: SiteId, nextSeed: number) => {
    setPhase("loading");
    setLoadError(null);
    setSite(chosen);
    setSeed(nextSeed);
    try {
      const [wx, study] = await Promise.all([
        getSpaceWeather(),
        getOsdrStudy({ role: "greenhouse" }),
      ]);
      const created = createGame(chosen, nextSeed);
      const sched = scheduleMissionEvents({
        seed: nextSeed,
        weather: wx,
        greenhouseStudies: [study],
      });
      const dayEvent =
        sched.days.find((d) => d.day === created.state.day)?.event ?? null;
      setWeather(wx);
      setGreenhouseStudy(study);
      setSchedule(sched);
      setState(created.state);
      setRng(() => created.rng);
      setTodaysEvent(dayEvent);
      const power = availablePower(
        created.state.site,
        created.state.day,
        created.state.panelBonus,
        created.state.battery,
      );
      const trimmed = trimDecisionsToBudget(defaultDecisions(), power);
      setDecisions(trimmed.decisions);
      setNovaLine(novaTrimSpeech(trimmed.turnedOff, 1));
      setCommsYesterday(false);
      setSheltering(false);
      setLastResult(null);
      setLastChoice(null);
      setLastDecisions(null);
      setDeltas([]);
      endingLock.current = false;
      resetMissionGuide();
      // Walk-the-base day loop (no Plan-day popup).
      setPhase("base");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load NASA data.",
      );
      setPhase("error");
    }
  }, []);

  const startTraining = useCallback(() => {
    setTrainingStep(0);
    setPhase("training");
  }, []);

  const pickSite = useCallback(
    async (chosen: SiteId) => {
      await bootstrapMission(chosen, seed);
    },
    [bootstrapMission, seed],
  );

  const retryLoad = useCallback(async () => {
    if (!site) {
      setPhase("site");
      return;
    }
    await bootstrapMission(site, seed);
  }, [bootstrapMission, site, seed]);

  const goPower = useCallback(() => setPhase("base"), []);
  const goEvent = useCallback(() => setPhase("base"), []);

  const advanceFromResult = useCallback(
    (result: ApplyDayResult, usedDecisions: DayDecisions) => {
      if (!schedule) return;
      setCommsYesterday(Boolean(usedDecisions.comms));
      if (result.lost || result.survived) {
        if (result.won) audio.play("missionSuccess");
        else if (result.lost) audio.play("missionFail");
        else audio.play("dayEnd");
        setPhase("end");
        endingLock.current = false;
        return;
      }
      const stormSlot = schedule.days.find((d) => d.day === result.dayLog.day);
      if (
        stormSlot?.afterStormCard &&
        result.dayLog.eventId.startsWith("solar-storm")
      ) {
        setAfterStormOpen(true);
      }
      const nextDay = result.state.day;
      const nextEvent =
        schedule.days.find((d) => d.day === nextDay)?.event ?? null;
      setTodaysEvent(nextEvent);
      const power = availablePower(
        result.state.site,
        result.state.day,
        result.state.panelBonus,
        result.state.battery,
      );
      // Carry plan forward, then shut off what we cannot afford.
      const trimmed = trimDecisionsToBudget(usedDecisions, power);
      setDecisions(trimmed.decisions);
      setNovaLine(novaTrimSpeech(trimmed.turnedOff, result.state.day));
      setSheltering(false);
      setLastResult(null);
      setLastChoice(null);
      setLastDecisions(null);
      setDeltas([]);
      endingLock.current = false;
      setPhase("base");
    },
    [schedule],
  );

  /**
   * End day from bed. Phaser shows the consequence overlay, then calls
   * continueAfterResult (no auto-advance timeout).
   */
  const endDayFromWorld = useCallback((): ResourceDelta[] => {
    if (!state || !todaysEvent || !rng || endingLock.current) return [];
    endingLock.current = true;
    const before = state;
    const isStorm = todaysEvent.stormSeverity !== undefined;
    const crewN = decisions.shelteredCrewCount;
    const allIn =
      crewN !== undefined ? crewN >= 3 : sheltering;
    let pick: "A" | "B" = isStorm ? (allIn ? "A" : "B") : "A";
    if (!isStorm && decisions.scienceLevel > 0) {
      const aWipe = todaysEvent.optionA.effects.scienceThatDay === 0;
      const bWipe = todaysEvent.optionB.effects.scienceThatDay === 0;
      if (aWipe && !bWipe) pick = "B";
    }
    const result = applyDay(state, decisions, todaysEvent, pick, rng);
    const nextDeltas = buildDeltas(before, result);
    setLastDecisions({ ...decisions });
    setLastChoice(pick);
    setLastResult(result);
    setDeltas(nextDeltas);
    setState(result.state);
    // Consequence overlay in Phaser calls continueAfterResult when tapped.
    return nextDeltas;
  }, [state, todaysEvent, rng, sheltering, decisions]);

  const chooseEvent = useCallback(
    (choice: "A" | "B") => {
      if (!state || !todaysEvent || !rng) return;
      const before = state;
      const result = applyDay(state, decisions, todaysEvent, choice, rng);
      setLastDecisions({ ...decisions });
      setLastChoice(choice);
      setLastResult(result);
      setDeltas(buildDeltas(before, result));
      setState(result.state);
      advanceFromResult(result, decisions);
    },
    [state, todaysEvent, decisions, rng, advanceFromResult],
  );

  const continueAfterResult = useCallback(() => {
    if (!lastResult) return;
    const used = lastDecisions ?? decisions;
    const result = lastResult;
    endingLock.current = false;
    advanceFromResult(result, used);
  }, [lastResult, lastDecisions, decisions, advanceFromResult]);

  const replay = useCallback(() => {
    const s =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1"
        ? DEMO_SEED
        : newSeed();
    setSeed(s);
    setSite(null);
    setState(null);
    setWeather(null);
    setSchedule(null);
    setGreenhouseStudy(null);
    setTodaysEvent(null);
    setLastResult(null);
    setLastChoice(null);
    setLastDecisions(null);
    setDeltas([]);
    setLoadError(null);
    setAfterStormOpen(false);
    setCommsYesterday(false);
    setSheltering(false);
    setNovaLine("Drag power chips onto machines. Drag Nova into bed to end the day.");
    endingLock.current = false;
    resetMissionGuide();
    setPhase("site");
  }, []);

  const openLegend = useCallback(() => {
    setLegendReturn(phase === "legend" ? "welcome" : phase);
    setPhase("legend");
  }, [phase]);

  const backFromLegend = useCallback(() => {
    setPhase(legendReturn === "legend" ? "welcome" : legendReturn);
  }, [legendReturn]);

  return {
    phase,
    trainingStep,
    seed,
    site,
    state,
    weather,
    greenhouseStudy,
    schedule,
    decisions,
    todaysEvent,
    lastResult,
    lastChoice,
    lastDecisions,
    deltas,
    loadError,
    glossaryOpen,
    afterStormOpen,
    powerToday,
    generationToday,
    stormAlerts,
    tomorrowHint,
    commsYesterday,
    novaLine,
    sheltering,
    setPhase,
    setTrainingStep,
    setDecisions,
    setGlossaryOpen,
    setAfterStormOpen,
    setNovaLine,
    setSheltering,
    startTraining,
    pickSite,
    retryLoad,
    goPower,
    goEvent,
    chooseEvent,
    endDayFromWorld,
    continueAfterResult,
    replay,
    openLegend,
    backFromLegend,
    siteRecords: sites.sites,
    missionDays: MISSION_DAYS,
  };
}

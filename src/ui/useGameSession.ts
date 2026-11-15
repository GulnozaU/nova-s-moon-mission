import { useCallback, useMemo, useState } from "react";
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
  type MissionSchedule,
} from "../content/schedule";
import type { Event, GameState, SiteId, SourceBadge } from "../types";
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
  deltas: ResourceDelta[];
  loadError: string | null;
  glossaryOpen: boolean;
  afterStormOpen: boolean;
  powerToday: number;
  generationToday: number;
  setPhase: (p: Phase) => void;
  setTrainingStep: (n: number) => void;
  setDecisions: (d: DayDecisions | ((prev: DayDecisions) => DayDecisions)) => void;
  setGlossaryOpen: (v: boolean) => void;
  setAfterStormOpen: (v: boolean) => void;
  startTraining: () => void;
  pickSite: (site: SiteId) => Promise<void>;
  retryLoad: () => Promise<void>;
  goPower: () => void;
  goEvent: () => void;
  chooseEvent: (choice: "A" | "B") => void;
  continueAfterResult: () => void;
  replay: () => void;
  openLegend: () => void;
  backFromLegend: () => void;
  siteRecords: typeof sites.sites;
  missionDays: number;
};

function newSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

function buildDeltas(
  before: GameState,
  result: ApplyDayResult,
): ResourceDelta[] {
  const after = result.state;
  const rows: ResourceDelta[] = [
    {
      key: "water",
      label: "Water",
      before: before.water,
      after: after.water,
      why: "Drank, cleaned, or watered plants",
      badge: "ASSUMPTION",
    },
    {
      key: "oxygen",
      label: "Oxygen",
      before: before.oxygen,
      after: after.oxygen,
      why: "Crew breath and air maker",
      badge: "ASSUMPTION",
    },
    {
      key: "battery",
      label: "Battery",
      before: before.battery,
      after: after.battery,
      why: "Leftover power chips stored",
      badge: "ASSUMPTION",
    },
    {
      key: "materials",
      label: "Materials",
      before: before.materials,
      after: after.materials,
      why: "Builds or event costs",
      badge: "ASSUMPTION",
    },
    {
      key: "exposure",
      label: "Crew safety risk",
      before: before.exposure,
      after: after.exposure,
      why: "Storm or time outside",
      badge: "ASSUMPTION",
    },
    {
      key: "science",
      label: "Science",
      before: before.science,
      after: after.science,
      why: "Work outside or greenhouse",
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
  const [deltas, setDeltas] = useState<ResourceDelta[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [afterStormOpen, setAfterStormOpen] = useState(false);
  const [legendReturn, setLegendReturn] = useState<Phase>("welcome");

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
        commsOn: true,
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
      setDecisions(defaultDecisions());
      setLastResult(null);
      setDeltas([]);
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

  const goPower = useCallback(() => setPhase("power"), []);
  const goEvent = useCallback(() => setPhase("event"), []);

  const chooseEvent = useCallback(
    (choice: "A" | "B") => {
      if (!state || !todaysEvent || !rng) return;
      const before = state;
      const result = applyDay(state, decisions, todaysEvent, choice, rng);
      setLastResult(result);
      setDeltas(buildDeltas(before, result));
      setState(result.state);
      setPhase("result");
    },
    [state, todaysEvent, decisions, rng],
  );

  const continueAfterResult = useCallback(() => {
    if (!lastResult || !schedule) return;
    if (lastResult.lost || lastResult.won) {
      setPhase("end");
      return;
    }
    const stormSlot = schedule.days.find(
      (d) => d.day === lastResult.dayLog.day,
    );
    if (stormSlot?.afterStormCard && lastResult.dayLog.eventId === "solar-storm") {
      setAfterStormOpen(true);
    }
    const nextDay = lastResult.state.day;
    const nextEvent =
      schedule.days.find((d) => d.day === nextDay)?.event ?? null;
    setTodaysEvent(nextEvent);
    setDecisions(defaultDecisions());
    setLastResult(null);
    setDeltas([]);
    setPhase("base");
  }, [lastResult, schedule]);

  const replay = useCallback(() => {
    const s = newSeed();
    setSeed(s);
    setSite(null);
    setState(null);
    setWeather(null);
    setSchedule(null);
    setGreenhouseStudy(null);
    setTodaysEvent(null);
    setLastResult(null);
    setDeltas([]);
    setLoadError(null);
    setAfterStormOpen(false);
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
    deltas,
    loadError,
    glossaryOpen,
    afterStormOpen,
    powerToday,
    generationToday,
    setPhase,
    setTrainingStep,
    setDecisions,
    setGlossaryOpen,
    setAfterStormOpen,
    startTraining,
    pickSite,
    retryLoad,
    goPower,
    goEvent,
    chooseEvent,
    continueAfterResult,
    replay,
    openLegend,
    backFromLegend,
    siteRecords: sites.sites,
    missionDays: MISSION_DAYS,
  };
}

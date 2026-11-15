import { ART } from "../art";
import type { EventOption } from "../../types";

type Chip = { kind: "add" | "take"; label: string; icon: string };

/** Preview chips for what an option adds / takes before confirm (SPEC 6c). */
export function costChipsFromOption(option: EventOption): Chip[] {
  const chips: Chip[] = [];
  const e = option.effects;

  const addNum = (n: number | undefined, label: string, icon: string) => {
    if (n === undefined || n === 0) return;
    if (n > 0) chips.push({ kind: "add", label: `+${n} ${label}`, icon });
    else chips.push({ kind: "take", label: `−${Math.abs(n)} ${label}`, icon });
  };

  addNum(e.oxygen, "oxygen", ART.iconLeaf);
  addNum(e.science, "science", ART.iconZap);
  addNum(e.materials, "parts", ART.crates);
  addNum(e.battery, "battery", ART.iconBattery);
  addNum(e.water, "water", ART.iconWater);
  addNum(e.exposure, "risk", ART.iconHeart);

  if (e.sheltered === true) {
    chips.push({ kind: "add", label: "more safety", icon: ART.iconShield });
    chips.push({ kind: "take", label: "no outdoor science", icon: ART.iconZap });
  }
  if (e.sheltered === false) {
    chips.push({ kind: "add", label: "keep science", icon: ART.iconZap });
    chips.push({ kind: "take", label: "more storm risk", icon: ART.iconSun });
  }
  if (e.scienceThatDay === 0) {
    chips.push({ kind: "take", label: "science today = 0", icon: ART.iconZap });
  }
  if (e.recyclerEfficiency !== undefined && e.recyclerEfficiency < 1) {
    chips.push({ kind: "take", label: "cleaner half strength", icon: ART.iconWater });
  }
  if (e.recyclerEfficiency === 1) {
    chips.push({ kind: "add", label: "cleaner full strength", icon: ART.iconWater });
  }
  if (e.riskChance) {
    chips.push({ kind: "take", label: "chance to lose parts", icon: ART.crates });
  }

  if (chips.length === 0) {
    chips.push({ kind: "add", label: option.benefit, icon: ART.iconZap });
    chips.push({ kind: "take", label: option.cost, icon: ART.iconWater });
  }
  return chips;
}

export function CostChips({ option }: { option: EventOption }) {
  const chips = costChipsFromOption(option);
  return (
    <ul className="cost-chips" aria-label="Cost preview">
      {chips.map((c, i) => (
        <li key={`${c.label}-${i}`} className={c.kind === "add" ? "is-add" : "is-take"}>
          <img src={c.icon} alt="" />
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

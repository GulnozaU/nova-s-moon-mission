import type { GameState, SourceBadge as Badge } from "../types";
import { LOSE_EXPOSURE_AT } from "../engine/constants";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";

type Row = {
  key: string;
  label: string;
  value: number;
  max: number;
  icon: string;
  badge: Badge;
  invert?: boolean;
};

type Props = {
  state: GameState;
};

export function ResourceBars({ state }: Props) {
  const rows: Row[] = [
    {
      key: "water",
      label: "Water",
      value: state.water,
      max: 40,
      icon: ART.iconWater,
      badge: "ASSUMPTION",
    },
    {
      key: "oxygen",
      label: "Oxygen",
      value: state.oxygen,
      max: 30,
      icon: ART.iconLeaf,
      badge: "ASSUMPTION",
    },
    {
      key: "battery",
      label: "Battery",
      value: state.battery,
      max: 20,
      icon: ART.iconBattery,
      badge: "ASSUMPTION",
    },
    {
      key: "materials",
      label: "Parts",
      value: state.materials,
      max: 20,
      icon: ART.crates,
      badge: "ASSUMPTION",
    },
    {
      key: "exposure",
      label: "Crew safety risk",
      value: state.exposure,
      max: LOSE_EXPOSURE_AT,
      icon: ART.iconHeart,
      badge: "ASSUMPTION",
      invert: true,
    },
    {
      key: "science",
      label: "Science",
      value: state.science,
      max: Math.max(20, state.science),
      icon: ART.iconZap,
      badge: "ASSUMPTION",
    },
  ];

  return (
    <ul className="resource-bars" aria-label="Base resources">
      {rows.map((row) => {
        const pct = Math.min(100, Math.max(0, (row.value / row.max) * 100));
        const danger =
          (row.invert && pct > 70) || (!row.invert && pct < 25 && row.key !== "science");
        return (
          <li key={row.key} className={danger ? "resource-bars__row is-danger" : "resource-bars__row"}>
            <img src={row.icon} alt="" className="resource-bars__icon" />
            <div className="resource-bars__meta">
              <div className="resource-bars__label">
                <span>{row.label}</span>
                <SourceBadge badge={row.badge} />
              </div>
              <div className="resource-bars__track" role="meter" aria-valuenow={row.value} aria-valuemin={0} aria-valuemax={row.max} aria-label={row.label}>
                <div
                  className="resource-bars__fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <strong className="resource-bars__value">
              {Number.isInteger(row.value) ? row.value : row.value.toFixed(1)}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

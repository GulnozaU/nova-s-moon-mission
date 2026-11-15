import { ART } from "./art";

type Hotspot = {
  id: string;
  label: string;
  x: string;
  y: string;
  art: string;
  onClick: () => void;
};

type Props = {
  site: "rim" | "plain";
  onOpenPower: () => void;
  onOpenGreenhouse: () => void;
  onOpenComms: () => void;
  onOpenGlossary: () => void;
};

export function BaseScene({
  site,
  onOpenPower,
  onOpenGreenhouse,
  onOpenComms,
  onOpenGlossary,
}: Props) {
  const background = site === "rim" ? ART.lunarSurface : ART.earthMoon;
  const hotspots: Hotspot[] = [
    {
      id: "habitat",
      label: "Home base",
      x: "18%",
      y: "58%",
      art: ART.habitatDome,
      onClick: onOpenGlossary,
    },
    {
      id: "panels",
      label: "Solar panels — assign power",
      x: "72%",
      y: "42%",
      art: ART.panels,
      onClick: onOpenPower,
    },
    {
      id: "greenhouse",
      label: "Greenhouse",
      x: "48%",
      y: "62%",
      art: ART.greenhouseDome,
      onClick: onOpenGreenhouse,
    },
    {
      id: "comms",
      label: "Talk to Earth",
      x: "82%",
      y: "68%",
      art: ART.dish,
      onClick: onOpenComms,
    },
    {
      id: "rover",
      label: "Rover",
      x: "32%",
      y: "72%",
      art: ART.rover,
      onClick: onOpenPower,
    },
    {
      id: "nova",
      label: "Nova",
      x: "58%",
      y: "74%",
      art: ART.nova,
      onClick: onOpenGlossary,
    },
  ];

  return (
    <div
      className="base-scene"
      style={{ backgroundImage: `url(${background})` }}
      role="img"
      aria-label={site === "rim" ? "South pole ridge base" : "Equatorial mare base"}
    >
      <div className="base-scene__sky float-soft" />
      {hotspots.map((h) => (
        <button
          key={h.id}
          type="button"
          className={`base-hotspot base-hotspot--${h.id} bob`}
          style={{ left: h.x, top: h.y }}
          onClick={h.onClick}
          aria-label={h.label}
        >
          <img src={h.art} alt="" />
          <span>{h.label}</span>
        </button>
      ))}
    </div>
  );
}

import { nasaImageReferenceLines } from "../content/images";
import { listArchivedOsdrStudies } from "../data/osdr";
import { SourceBadge } from "./SourceBadge";
import type { SourceBadge as Badge } from "../types";

const BADGES: Array<{ badge: Badge; meaning: string }> = [
  { badge: "LIVE", meaning: "Fetched just now from a NASA service." },
  { badge: "ARCHIVED", meaning: "Saved real NASA record used when live fails." },
  { badge: "REFERENCE", meaning: "From a published NASA or science fact." },
  { badge: "ASSUMPTION", meaning: "A game number we chose for play balance." },
  { badge: "STORY", meaning: "Made for the story, not a real mission event." },
  { badge: "OSDR", meaning: "Tied to a real space-biology study." },
];

type Props = {
  onBack: () => void;
};

export function LegendScreen({ onBack }: Props) {
  const images = nasaImageReferenceLines();
  const studies = listArchivedOsdrStudies();

  return (
    <section className="panel legend-screen">
      <header className="panel__head">
        <div>
          <h2>About the data</h2>
          <p>Where numbers and pictures come from.</p>
        </div>
      </header>

      <ul className="legend-badges">
        {BADGES.map((b) => (
          <li key={b.badge}>
            <SourceBadge badge={b.badge} />
            <span>{b.meaning}</span>
          </li>
        ))}
      </ul>

      <h3>NASA pictures used</h3>
      <ul className="legend-sources">
        {images.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3>Plant studies (OSDR)</h3>
      <ul className="legend-sources">
        {studies.map((s) => (
          <li key={s.id}>
            {s.id}: {s.title}. {s.url}
          </li>
        ))}
      </ul>

      <h3>How we use DONKI</h3>
      <p>
        DONKI is NASA&apos;s Database Of Notifications, Knowledge, Information —
        the CCMC catalog of real solar flares and coronal mass ejections (CMEs).
        We fetch flare (FLR) and CME records from the public DONKI API when the
        mission starts. If the live call fails, we fall back to archived real
        DONKI events shipped with the game.
      </p>
      <ul className="legend-sources">
        <li>
          Flare class letters (C / M / X) map to storm severity 1 / 2 / 3 — that
          numeric map is an ASSUMPTION for play balance; the flare IDs and dates
          are real DONKI records.
        </li>
        <li>
          CME speed from DONKI analysis drives warning time: travel hours ≈
          149,600,000 km ÷ speed, then warning days = floor(hours ÷ 24). Without
          radio/comms, warning days are halved.
        </li>
        <li>
          Two storm days are scheduled in the 10-day run from those DONKI
          records. Alerts and storm cards show the real event date and flare ID
          when known. Kids see plain language; this page keeps the source name.
        </li>
      </ul>

      <div className="panel__actions">
        <button type="button" className="btn primary" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

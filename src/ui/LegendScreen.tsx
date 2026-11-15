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
          <h2>What is real and what is simplified</h2>
          <p>Every number in the game wears a badge.</p>
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

      <h3>NASA pictures</h3>
      <ul className="legend-sources">
        {images.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3>OSDR studies</h3>
      <ul className="legend-sources">
        {studies.map((s) => (
          <li key={s.id}>
            {s.id}: {s.title}. {s.url}
          </li>
        ))}
      </ul>

      <p className="legend-disclaimer">
        Real data from NASA. This game is not made or endorsed by NASA.
      </p>

      <div className="panel__actions">
        <button type="button" className="btn primary" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

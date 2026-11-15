import type { Event } from "../types";
import { SourceBadge } from "./SourceBadge";
import { CardNasaImage } from "./CardNasaImage";

type Props = {
  event: Event;
  onChoose: (choice: "A" | "B") => void;
  onBack: () => void;
};

export function EventCardView({ event, onChoose, onBack }: Props) {
  return (
    <section className="panel event-card">
      <header className="panel__head">
        <div>
          <p className="eyebrow">
            Today&apos;s choice <SourceBadge badge={event.sourceBadge} />
          </p>
          <h2>{event.title}</h2>
        </div>
      </header>

      {event.image ? (
        <CardNasaImage image={event.image} className="event-card__photo" />
      ) : null}

      <p className="event-card__explain">{event.explanation}</p>
      <p className="event-card__note">{event.realWorldNote}</p>

      <div className="event-options">
        <button
          type="button"
          className="event-option"
          onClick={() => onChoose("A")}
        >
          <strong>{event.optionA.label}</strong>
          <span className="good">Helps: {event.optionA.benefit}</span>
          <span className="cost">Costs: {event.optionA.cost}</span>
        </button>
        <button
          type="button"
          className="event-option"
          onClick={() => onChoose("B")}
        >
          <strong>{event.optionB.label}</strong>
          <span className="good">Helps: {event.optionB.benefit}</span>
          <span className="cost">Costs: {event.optionB.cost}</span>
        </button>
      </div>

      <div className="panel__actions">
        <button type="button" className="btn ghost" onClick={onBack}>
          Back to power
        </button>
      </div>
    </section>
  );
}

import type { SpaceWeatherResult } from "../data/donkiTypes";
import { severityFromFlareClass } from "../data/severity";
import { warningFromCmeSpeed } from "../data/warning";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { CardNasaImage } from "./CardNasaImage";

type Props = {
  weather: SpaceWeatherResult;
  commsOn: boolean;
};

export function WeatherCard({ weather, commsOn }: Props) {
  const flare = weather.strongestFlare;
  const severity = flare
    ? severityFromFlareClass(flare.classType).severity
    : null;
  const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 0;
  const warning = warningFromCmeSpeed(speed > 0 ? speed : 500, commsOn);
  const size =
    severity === 3 ? "big" : severity === 2 ? "medium" : "small";
  const sunIcon =
    severity === 3 ? ART.iconSun : severity === 2 ? ART.iconSunMed : ART.iconSunDim;

  return (
    <article className="weather-card">
      <header className="weather-card__head">
        <img src={sunIcon} alt="" className="weather-card__sun bob" />
        <div>
          <h2>Today&apos;s real space weather</h2>
          <p className="weather-card__date">
            <img src={ART.iconCalendar} alt="" />
            NASA saw this on {weather.eventDate ?? "an archived day"}
            <SourceBadge badge={weather.source} />
          </p>
        </div>
      </header>
      <CardNasaImage slot="storm" className="weather-card__photo" />
      <p className="weather-card__line">
        NASA saw a {size} storm on the Sun. The storm cloud may reach the Moon in
        about {warning.warningDays} day{warning.warningDays === 1 ? "" : "s"}.
      </p>
      {flare ? (
        <p className="weather-card__how">
          How do we know? Flare {flare.classType} · id {flare.flrID}
        </p>
      ) : null}
    </article>
  );
}

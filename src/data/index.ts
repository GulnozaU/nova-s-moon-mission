export {
  getSpaceWeather,
  archivedSpaceWeather,
  clearDonkiCache,
  donkiArchive,
  DONKI_CACHE_KEY,
  DONKI_CACHE_TTL_MS,
} from "./donki";
export {
  severityFromFlareClass,
  flareClassLetter,
  type FlareSeverity,
  type SeverityResult,
} from "./severity";
export {
  warningFromCmeSpeed,
  AU_KM,
  type WarningResult,
} from "./warning";
export {
  fetchDonkiLive,
  DONKI_CCMC_BASE,
  DONKI_API_SERVER,
} from "./donkiUpstream";
export {
  selectStrongestFlare,
  selectFastestCme,
} from "./donkiSelect";
export type {
  SpaceWeatherResult,
  DonkiFlare,
  DonkiCme,
  DonkiApiResponse,
} from "./donkiTypes";

export {
  getOsdrStudy,
  listArchivedOsdrStudies,
  pickArchivedOsdrStudy,
  pickOsdrStudy,
  OSDR_CACHE_KEY,
  OSDR_CACHE_TTL_MS,
} from "./osdr";
export {
  fetchOsdrLive,
  fetchOsdrMetaRaw,
  findingFromDescription,
  OSDR_SEARCH_URL,
  OSDR_META_BASE,
  OSDR_STUDY_PAGE,
} from "./osdrUpstream";
export type { OsdrStudy, OsdrApiResponse, OsdrSource } from "./osdrTypes";

import sitesJson from "./sites.json";

export const sites = sitesJson;
export type SiteRecord = (typeof sitesJson)["sites"][number];

export type OsdrSource = "LIVE" | "ARCHIVED";

/** Normalized OSDR study card for the game (SPEC 4.3 / Prompt 3b). */
export type OsdrStudy = {
  id: string;
  title: string;
  organism: string;
  mission: string;
  /** One plain-language finding from the study record (not invented). */
  finding: string;
  url: string;
  source: OsdrSource;
  /** Optional: greenhouse vs radiation teaching role. */
  role?: "greenhouse" | "radiation" | "general";
};

export type OsdrApiSuccess = {
  ok: true;
  source: "LIVE";
  study: OsdrStudy;
  searched: number;
};

export type OsdrApiEmpty = {
  ok: true;
  empty: true;
  source: "LIVE";
  study: null;
  searched: number;
  message: string;
};

export type OsdrApiError = {
  ok: false;
  error: string;
};

export type OsdrApiResponse = OsdrApiSuccess | OsdrApiEmpty | OsdrApiError;

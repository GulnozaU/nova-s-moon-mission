/**
 * Search NASA Image and Video Library (no API key).
 *
 * Confirmed endpoints (NASA docs:
 * https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf ):
 *   GET https://images-api.nasa.gov/search?q=…&media_type=image
 *   GET https://images-api.nasa.gov/asset/{nasa_id}
 *   GET https://images-api.nasa.gov/metadata/{nasa_id}
 * Page: https://images.nasa.gov/details-{nasa_id}
 *
 * Usage: npm run find-images
 */

const API_ROOT = "https://images-api.nasa.gov";
const PAGE_BASE = "https://images.nasa.gov/details-";

/** Display label + search query (tuned so “plant” / “south pole” stay on-topic). */
const TOPICS: ReadonlyArray<{ label: string; query: string; prefer?: RegExp }> =
  [
    {
      label: "Earth from the Moon",
      query: "Earth from the Moon",
      prefer: /\bearth\b/i,
    },
    {
      label: "solar flare on the Sun",
      query: "solar flare Sun SDO",
      prefer: /flare|sun/i,
    },
    {
      label: "Moon south pole",
      query: "Moon south pole Clementine",
      prefer: /\bmoon\b|lunar|clementine|lro/i,
    },
    {
      label: "Apollo lunar dust",
      query: "Apollo lunar dust",
      prefer: /apollo|lunar|dust|suit/i,
    },
    {
      label: "plants grown in lunar soil",
      query: "plant lunar material",
      prefer: /plant|growth|lunar|seed|veggie|arabidopsis/i,
    },
  ];

type SearchData = {
  center?: string;
  title?: string;
  nasa_id?: string;
  description?: string;
  description_508?: string;
  keywords?: string[];
  photographer?: string;
  secondary_creator?: string;
  media_type?: string;
};

type SearchItem = {
  href?: string;
  data?: SearchData[];
  links?: Array<{ href?: string; rel?: string; render?: string }>;
};

const THIRD_PARTY_RE =
  /third[- ]party|copyrighted by|©|\(c\)|all rights reserved|not (?:in )?the public domain|permission (?:of|from)|proprietary/i;

const LOGO_RE =
  /\bnasa (?:logo|insignia|meatball|worm)\b|\binsignia\b|\bofficial (?:nasa )?logo\b/i;

/** Off-topic bodies that pollute “south pole” searches. */
const OFF_TOPIC_RE =
  /\btitan\b|\bsaturn\b|\bmars\b|\beuropa\b|\bjupiter\b|\benceladus\b/i;

function blobOf(data: SearchData): string {
  return [data.title, data.description, data.description_508, ...(data.keywords ?? [])]
    .filter(Boolean)
    .join("\n");
}

function creditFrom(data: SearchData): string {
  const who =
    data.secondary_creator?.trim() ||
    data.photographer?.trim() ||
    (data.center ? `NASA/${data.center}` : "NASA");
  return who.startsWith("Image:") ? who : `Image: ${who}`;
}

function pageUrl(nasaId: string): string {
  return `${PAGE_BASE}${nasaId}`;
}

function isThirdParty(data: SearchData): boolean {
  return THIRD_PARTY_RE.test(blobOf(data));
}

function looksLikeLogo(data: SearchData): boolean {
  return LOGO_RE.test(blobOf(data));
}

function isOffTopic(data: SearchData, prefer?: RegExp): boolean {
  const blob = blobOf(data);
  if (OFF_TOPIC_RE.test(blob) && !/\bmoon\b|lunar|apollo|clementine/i.test(blob)) {
    return true;
  }
  if (prefer && !prefer.test(blob)) return true;
  return false;
}

async function searchTopic(q: string, pageSize = 40): Promise<SearchItem[]> {
  const url = new URL(`${API_ROOT}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", String(pageSize));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`search failed ${res.status} for ${q}`);
  }
  const json = (await res.json()) as {
    collection?: { items?: SearchItem[] };
  };
  return json.collection?.items ?? [];
}

function printHit(rank: number, data: SearchData, note?: string): void {
  const id = data.nasa_id ?? "?";
  console.log(`  ${rank}. NASA ID: ${id}`);
  console.log(`     Title:  ${data.title ?? "(none)"}`);
  console.log(`     Credit: ${creditFrom(data)}`);
  console.log(`     Page:   ${pageUrl(id)}`);
  if (note) console.log(`     Note:   ${note}`);
  console.log("");
}

async function main(): Promise<void> {
  console.log("NASA Image and Video Library — find-images");
  console.log(`API root: ${API_ROOT} (no key)`);
  console.log("Docs:     https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf");
  console.log("");

  for (const topic of TOPICS) {
    console.log(`=== Topic: ${topic.label} ===`);
    console.log(`    query: "${topic.query}"`);
    const items = await searchTopic(topic.query);
    let shown = 0;

    for (const item of items) {
      const data = item.data?.[0];
      if (!data?.nasa_id || data.media_type !== "image") continue;

      if (isThirdParty(data)) continue;
      if (looksLikeLogo(data)) continue;
      if (isOffTopic(data, topic.prefer)) continue;

      shown += 1;
      printHit(shown, data);
      if (shown >= 5) break;
    }

    if (shown === 0) {
      console.log("  (no usable image hits after filtering)");
      console.log("");
    }
  }

  console.log(
    "Pick 6–8 NASA IDs (map to title / storm / sites / dust / greenhouse) and paste them back.",
  );
  console.log("Skipped: third-party copyright flags, logo/insignia-looking records, off-topic bodies.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/**
 * Vercel serverless route: GET /api/donki
 * Proxies CCMC DONKI-API (no key). Confirmed base after 30 Sept 2026 move:
 *   https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR|CME}
 */
import { fetchDonkiLive } from "../src/data/donkiUpstream.ts";

type Req = { method?: string };
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const result = await fetchDonkiLive();
  const status = result.ok === false ? 502 : 200;
  res.status(status).json(result);
}

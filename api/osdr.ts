/**
 * Vercel serverless route: GET /api/osdr
 * Proxies OSDR search + meta (no key). See src/data/osdrUpstream.ts for URL notes.
 */
import { fetchOsdrLive } from "../src/data/osdrUpstream.ts";

type Req = { method?: string; url?: string };
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const result = await fetchOsdrLive();
  const status = result.ok === false ? 502 : 200;
  res.status(status).json(result);
}

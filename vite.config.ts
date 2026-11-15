import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { fetchDonkiLive } from "./src/data/donkiUpstream.ts";
import { fetchOsdrLive } from "./src/data/osdrUpstream.ts";

/** Local `/api/donki` and `/api/osdr` during `vite dev` (no API keys). */
function nasaProxyPlugin(): Plugin {
  return {
    name: "nova-nasa-apis",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/donki") && !url.startsWith("/api/osdr")) {
          next();
          return;
        }
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
          return;
        }
        try {
          const result = url.startsWith("/api/osdr")
            ? await fetchOsdrLive()
            : await fetchDonkiLive();
          res.statusCode = result.ok === false ? 502 : 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), nasaProxyPlugin()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});

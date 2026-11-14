import path from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath, pathToFileURL } from "node:url"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * Local development only: serves /api/* from the same handlers Vercel runs
 * (server/functions/*.mjs), so `npm run dev` has live NASA climate, weather and chat.
 * Keys come from .env.local (git-ignored), e.g. GEMINI_API_KEY.
 */
function localApi() {
  return {
    name: "kisan-local-api",
    apply: "serve",
    configureServer(server) {
      Object.assign(process.env, loadEnv("development", root, ""));
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/api\/([a-z-]+)(\/[^?]*)?(\?.*)?$/.exec(req.url || "");
        if (!m) return next();
        try {
          const file = path.resolve(root, "server/functions", `${m[1]}.mjs`);
          const { default: handler } = await import(pathToFileURL(file).href);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Readable.toWeb(req) : undefined,
            duplex: hasBody ? "half" : undefined,
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) Readable.fromWeb(response.body).pipe(res);
          else res.end();
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
});

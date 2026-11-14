// Vercel entry point for /api/terrain. The handler lives in server/functions/terrain.mjs (also used by `npm run dev`).
import handler from "../server/functions/terrain.mjs";

export const GET = (request) => handler(request);

// Vercel entry point for /api/satellite. The handler lives in server/functions/satellite.mjs (also used by `npm run dev`).
import handler from "../server/functions/satellite.mjs";

export const GET = (request) => handler(request);

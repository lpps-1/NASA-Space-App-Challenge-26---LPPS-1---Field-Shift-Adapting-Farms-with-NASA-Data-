// Vercel entry point for /api/climate. The handler lives in server/functions/climate.mjs (also used by `npm run dev`).
import handler from "../server/functions/climate.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

// Vercel entry point for /api/weather. The handler lives in server/functions/weather.mjs (also used by `npm run dev`).
import handler from "../server/functions/weather.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

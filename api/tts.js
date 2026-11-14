// Vercel entry point for /api/tts. The handler lives in server/functions/tts.mjs (also used by `npm run dev`).
import handler from "../server/functions/tts.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

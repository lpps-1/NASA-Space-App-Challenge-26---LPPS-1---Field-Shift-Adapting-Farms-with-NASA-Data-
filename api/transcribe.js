// Vercel entry point for /api/transcribe. The handler lives in server/functions/transcribe.mjs (also used by `npm run dev`).
import handler from "../server/functions/transcribe.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

// Vercel entry point for /api/assistant. The handler lives in server/functions/assistant.mjs (also used by `npm run dev`).
import handler from "../server/functions/assistant.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

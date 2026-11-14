// Vercel entry point for /api/speech-text. The handler lives in server/functions/speech-text.mjs (also used by `npm run dev`).
import handler from "../server/functions/speech-text.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

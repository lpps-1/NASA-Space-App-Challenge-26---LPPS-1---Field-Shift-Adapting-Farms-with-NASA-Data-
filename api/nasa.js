// Vercel entry point for /api/nasa. The handler lives in server/functions/nasa.mjs (also used by `npm run dev`).
import handler from "../server/functions/nasa.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

// Vercel entry point for /api/auth-google. The handler lives in server/functions/auth-google.mjs (also used by `npm run dev`).
import handler from "../server/functions/auth-google.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

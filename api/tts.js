// Vercel entry point for /api/tts. The handler is shared with Netlify (netlify/functions/tts.mjs).
import handler from "../netlify/functions/tts.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

// Vercel entry point for /api/transcribe. The handler is shared with Netlify (netlify/functions/transcribe.mjs).
import handler from "../netlify/functions/transcribe.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

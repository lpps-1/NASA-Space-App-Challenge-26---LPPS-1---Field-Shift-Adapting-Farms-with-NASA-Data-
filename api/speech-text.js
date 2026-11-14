// Vercel entry point for /api/speech-text. The handler is shared with Netlify (netlify/functions/speech-text.mjs).
import handler from "../netlify/functions/speech-text.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

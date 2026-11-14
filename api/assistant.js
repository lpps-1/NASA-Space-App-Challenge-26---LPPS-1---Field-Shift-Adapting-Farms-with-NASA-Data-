// Vercel entry point for /api/assistant. The handler is shared with Netlify (netlify/functions/assistant.mjs).
import handler from "../netlify/functions/assistant.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

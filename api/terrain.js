// Vercel entry point for /api/terrain. The handler is shared with Netlify (netlify/functions/terrain.mjs).
import handler from "../netlify/functions/terrain.mjs";

export const GET = (request) => handler(request);

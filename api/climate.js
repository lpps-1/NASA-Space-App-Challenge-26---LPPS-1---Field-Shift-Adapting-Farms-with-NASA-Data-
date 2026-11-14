// Vercel entry point for /api/climate. The handler is shared with Netlify (netlify/functions/climate.mjs).
import handler from "../netlify/functions/climate.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

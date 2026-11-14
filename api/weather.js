// Vercel entry point for /api/weather. The handler is shared with Netlify (netlify/functions/weather.mjs).
import handler from "../netlify/functions/weather.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

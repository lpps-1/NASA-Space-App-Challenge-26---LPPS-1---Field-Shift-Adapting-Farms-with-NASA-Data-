// Vercel entry point for /api/nasa. The handler is shared with Netlify (netlify/functions/nasa.mjs).
import handler from "../netlify/functions/nasa.mjs";

export const GET = (request) => handler(request);
export const POST = (request) => handler(request);

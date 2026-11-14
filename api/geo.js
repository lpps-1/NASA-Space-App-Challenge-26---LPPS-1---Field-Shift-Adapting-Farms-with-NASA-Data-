// Vercel entry point for /api/geo and /api/geo/* (vercel.json rewrites sub-paths here as ?__path=).
// The handler is shared with Netlify (netlify/functions/geo.mjs) and reads the sub-path from the URL.
import handler from "../netlify/functions/geo.mjs";

export function GET(request) {
  const url = new URL(request.url);
  const sub = url.searchParams.get("__path");
  if (sub != null) {
    url.searchParams.delete("__path");
    url.pathname = `/api/geo/${sub}`.replace(/\/+$/, "");
    request = new Request(url, request);
  }
  return handler(request);
}

/**
 * POST /api/auth-google   { "access_token": "<token from Google's sign-in popup>" }
 *
 * Checks a Google sign-in with Google itself and returns the account it belongs to:
 *   { "id": "g_<google user id>", "email": "...", "name": "...", "picture": "..." }
 *
 * The browser gets the token from Google Identity Services (src/lib/googleSignIn.js). The token
 * must have been issued to this site's Google OAuth client (GOOGLE_CLIENT_ID, or the same value as
 * VITE_GOOGLE_CLIENT_ID), so a token made for another app is refused. The token is only used for
 * these two checks and is not stored.
 */
const TIMEOUT_MS = 8000;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed. Use POST." });

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return json(503, { error: "Google sign-in is not set up on this site yet (GOOGLE_CLIENT_ID is missing)." });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const token = typeof body?.access_token === "string" ? body.access_token.trim() : "";
  if (!token || token.length > 4096) return json(400, { error: "Missing Google sign-in token." });

  try {
    // 1. Was this token issued to our app, and is it still valid?
    const infoRes = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!infoRes.ok) return json(401, { error: "Google did not accept this sign-in. Please try again." });
    const info = await infoRes.json();
    if (info.aud !== clientId && info.azp !== clientId) return json(401, { error: "This Google sign-in was made for a different app." });
    if (Number(info.expires_in) <= 0) return json(401, { error: "This Google sign-in has expired. Please try again." });

    // 2. Who is it?
    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!userRes.ok) return json(401, { error: "Google did not share your account details. Please try again." });
    const u = await userRes.json();
    if (!u.sub || (info.sub && info.sub !== u.sub)) return json(401, { error: "Google sign-in could not be confirmed. Please try again." });
    if (!u.email || u.email_verified === false) return json(403, { error: "Your Google account's email address is not verified yet." });

    return json(200, {
      id: `g_${u.sub}`,
      email: String(u.email).toLowerCase(),
      name: typeof u.name === "string" ? u.name.slice(0, 120) : "",
      picture: typeof u.picture === "string" ? u.picture : "",
    });
  } catch (err) {
    console.warn("auth-google: Google check failed", err?.name, err?.message?.slice(0, 120));
    return json(502, { error: "Couldn't reach Google to confirm the sign-in. Check the internet and try again." });
  }
};

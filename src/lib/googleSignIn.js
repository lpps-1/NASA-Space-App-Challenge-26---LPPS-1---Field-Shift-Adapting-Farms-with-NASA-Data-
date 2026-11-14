/**
 * Google sign-in that works on any host (Vercel included), using Google Identity Services.
 *
 * 1. `googleAccessToken()` opens Google's own account-chooser popup and returns a short-lived token.
 * 2. `verifyGoogle(token)` sends it to /api/auth-google, which checks it with Google and returns
 *    { id, email, name, picture }. AuthContext then opens that account.
 *
 * Needs VITE_GOOGLE_CLIENT_ID (an OAuth "Web application" client from Google Cloud Console).
 * Without it the button still shows, and tapping it explains that Google sign-in isn't set up.
 */
const SCRIPT_URL = "https://accounts.google.com/gsi/client";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

/** Thrown when the farmer closes the Google popup; not shown as an error. */
export class GoogleCancelled extends Error {}

let loading = null;

/** Loads Google's script once. Called early (when the sign-in page opens) so the popup isn't blocked. */
export function preloadGoogle() {
  if (!GOOGLE_CLIENT_ID || typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        s.remove();
        reject(new Error("Couldn't load Google sign-in. Check the internet and try again."));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function googleAccessToken() {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in isn't set up on this site yet. Use email and password, or explore the demo farm.");
  await preloadGoogle();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      prompt: "select_account",
      callback: (r) => (r?.access_token ? resolve(r.access_token) : reject(new Error(r?.error_description || r?.error || "Google sign-in didn't finish. Please try again."))),
      error_callback: (e) =>
        reject(e?.type === "popup_closed" ? new GoogleCancelled("closed") : new Error(e?.type === "popup_failed_to_open" ? "Your browser blocked the Google window. Allow pop-ups for this site and try again." : "Google sign-in didn't finish. Please try again.")),
    });
    client.requestAccessToken();
  });
}

export async function verifyGoogle(token) {
  const res = await fetch("/api/auth-google", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: token }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id) throw new Error(body?.error || "Google sign-in could not be confirmed. Please try again.");
  return body;
}

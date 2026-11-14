# Pakistan Kisan AI

> **NASA Space Apps Challenge 2026 · Team LPPS-1 (Lahore) · Field Shift: Adapting Farms with NASA Data**
>
> **Note on how this code was uploaded:** we built this prototype before the event and worked offline, because our internet connection is very poor. Uploading everything at once kept failing, so we pushed the history to GitHub in several smaller pushes. The commits labelled "Prototype part N/11 (pre-event)" are the prototype split into 11 parts in build order. Their dates show when the history was put together, not when each part was written. Work done during the hackathon is added after them as normal commits.

A farming companion for Pakistani farmers. It has a dashboard with weather, fields and upcoming work. It also has a voice-enabled, agriculture-only AI assistant that answers farming questions in Urdu, Punjabi or English (and politely declines anything unrelated to farming), a farm calendar, farm calculators, a farmer profile, and an admin knowledge base.

The app was originally built on Base44. It now runs fully independently, with no Base44 account, SDK, API key or hosted service involved.

## Tech

- Vite + React 18, React Router 7, TanStack Query
- Tailwind CSS 3 with the original Kisan design tokens (`src/index.css`)
- Browser Web Speech API for voice input and spoken replies
- Hosted on Netlify (static SPA). Netlify Functions, Database, Identity and AI Gateway are planned.

## Run locally

```bash
npm install
npm run dev            # or: netlify dev  (adds Netlify features once the backend lands)
```

Click **Explore the demo farm** on the sign-in screen. All data is stubbed in `src/data/fixtures.js` and changes are kept in the browser's localStorage. **Settings → Reset demo data** clears them.

## AI setup (chat and voice)

Chat answers and voice both run on **Google Gemini** (default chat model `gemini-3.5-flash`).

1. Get a free key at [aistudio.google.com](https://aistudio.google.com) → **Get API key**.
2. In Netlify: **Project configuration → Environment variables → Add a variable**: `GEMINI_API_KEY` = your key.
3. **Deploys → Trigger deploy**.

On a credit-based Netlify plan you can skip the key: Netlify AI Gateway supplies one. Optional variables:

| Variable | What it does |
| --- | --- |
| `KISAN_CHAT_MODEL` | Chat model id, e.g. `gemini-3.8-flash` |
| `KISAN_CHAT_PROVIDER` | `claude` to use Claude instead (needs `ANTHROPIC_API_KEY` or AI Gateway) |
| `KISAN_TTS` | `off` to stop using the online Urdu voice |
| `KISAN_TTS_VOICE` | Gemini voice name for spoken Urdu (default `Kore`) |
| `KISAN_TTS_MODEL` | Gemini speech model to try first |

**Spoken Urdu.** Most computers (and some phones) have no Urdu voice. On those, `/api/tts` makes real Pakistani Urdu speech with Gemini's speech model (Urdu `ur-PK`, preview), using the same key. If it fails or the daily limit is reached, the app falls back to the device's own voices (a Hindi voice reading the Urdu words), so speech never stops. A device with a native Urdu voice (Edge, Android with Urdu voice data), or a voice picked in Settings, uses that voice instead.

If the key is missing or wrong, the chat says "Kisan AI isn't set up yet" and the reason is in **Logs → Functions → assistant**.

## Accounts and Google sign-in

Accounts use **Netlify Identity** through `@netlify/identity`: email + password, **Continue with Google**, email confirmation and password reset. When Identity isn't reachable (plain `npm run dev`), sign-in falls back to local accounts in the browser. **Explore the demo farm** always works.

### Turn on Google sign-in (one time, on the live site)

1. Deploy the site to Netlify.
2. In the Netlify project, open **Identity** and click **Enable Identity**.
3. Under **Identity → Registration**, choose **Open** (anyone can sign up) or **Invite only**.
4. Under **Identity → Registration → External providers**, click **Add provider → Google**.
   - **Quick start:** keep **Use default configuration**. It works right away, but Google's consent screen shows "Netlify Identity" instead of your app name.
   - **Branded (recommended for launch):** choose **Use custom credentials** and follow the steps below.
5. Test it: open the live site, tap **Continue with Google**, pick an account. A first-time farmer goes straight to farm setup.

### Your own Google credentials (shows "Kisan AI" on the Google screen)

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g. "Kisan AI").
2. **APIs & Services → OAuth consent screen**: choose **External**, set the app name, support email, logo and your site's domain, then publish the app.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**:
   - **Authorized JavaScript origins:** `https://YOUR-SITE.netlify.app` (and your custom domain, if any)
   - **Authorized redirect URIs:** the callback Netlify Identity uses for your site, normally `https://YOUR-SITE.netlify.app/.netlify/identity/callback` (and the same path on your custom domain). If Google shows **Error 400: redirect_uri_mismatch** when you test, click **error details** on that page: it shows the exact `redirect_uri` Google received. Add that exact value here, save, wait a few minutes and try again.
4. Copy the **Client ID** and **Client secret** into Netlify (**Identity → External providers → Google → Use custom credentials**).

### Admins

Users who manage the knowledge base need the `admin` role: **Identity → Users → (user) → Edit settings → Roles → `admin`**. Everyone else is a farmer.

### Testing locally

Run `netlify dev` (not `npm run dev`) and link the folder to your Netlify site (`netlify link`), so `/.netlify/identity` is available. Google's redirect only goes to the URLs you listed, so Google sign-in is easiest to test on a deploy preview or the live site.

## Farm setup

Right after sign-in, a farmer who hasn't finished farm setup is sent to `/onboarding`: name and language, location, land and water sources, crops now / last season / usual rotation, and up to 3 goals for the season. The answers are saved on the profile (editable under **My farm**), shown on the dashboard's **Your farm plan** card, and sent to Kisan AI with every question.

## Project docs

- `PLAN.md`: roadmap of what's next (data model, real accounts, live AI, photo diagnosis, weather alerts)
- `PROJECT_AUDIT.md`: what was received from the Base44 export and what changed
- `ARCHITECTURE.md`: how the app is structured
- `MIGRATION_PLAN.md`: what replaces each Base44 piece
- `FEATURE_STATUS.md`: feature-by-feature status

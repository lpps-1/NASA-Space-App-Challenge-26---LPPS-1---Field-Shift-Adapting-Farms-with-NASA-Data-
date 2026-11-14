# Pakistan Kisan AI

> **NASA Space Apps Challenge 2026 · Team LPPS-1 (Lahore) · Field Shift: Adapting Farms with NASA Data**
>
> **Note on how this code was uploaded:** we built this prototype before the event and worked offline, because our internet connection is very poor. Uploading everything at once kept failing, so we pushed the history to GitHub in several smaller pushes. The commits labelled "Prototype part N/11 (pre-event)" are the prototype split into 11 parts in build order. Their dates show when the history was put together, not when each part was written. Work done during the hackathon is added after them as normal commits.

A farming companion for Pakistani farmers. It has a dashboard with weather, fields and upcoming work. It also has a voice-enabled, agriculture-only AI assistant that answers farming questions in Urdu, Punjabi or English (and politely declines anything unrelated to farming), a farm calendar, farm calculators, a farmer profile, and an admin knowledge base.

The app was originally built on Base44. It now runs fully independently, with no Base44 account, SDK, API key or hosted service involved.

## Tech

- Vite + React 18, React Router 7, TanStack Query
- Tailwind CSS 3 with the original Kisan design tokens (`src/index.css`)
- Hosted on **Vercel**: the static app plus serverless functions in `api/` (each one is a thin wrapper around a handler in `server/functions/`)
- Google Gemini for chat, speech-to-text and Urdu speech; browser speech as a fallback

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your GEMINI_API_KEY in .env.local (git-ignored)
npm run dev                  # serves the app and /api/* from server/functions
```

Click **Explore the demo farm** on the sign-in screen. Farm data is kept in the browser's localStorage. **Settings → Reset demo data** clears it.

## AI setup (chat and voice)

Chat answers and voice both run on **Google Gemini** (default chat model `gemini-3.5-flash`).

1. Get a key at [aistudio.google.com](https://aistudio.google.com) → **Get API key**.
2. In Vercel: **Project → Settings → Environment Variables → Add**: name `GEMINI_API_KEY`, value = your key, for Production and Preview.
3. **Deployments → ⋯ → Redeploy** so the new variable is picked up.

Never put the key in the code or in a commit. Optional variables:

| Variable | What it does |
| --- | --- |
| `KISAN_CHAT_MODEL` | Chat model id, e.g. `gemini-3.8-flash` |
| `KISAN_CHAT_PROVIDER` | `claude` to use Claude instead (needs `ANTHROPIC_API_KEY`) |
| `KISAN_TTS` | `off` to stop using the online Urdu voice |
| `KISAN_TTS_VOICE` | Gemini voice name for spoken Urdu (default `Charon`, a male voice to match Kisan AI's masculine Urdu) |
| `KISAN_TTS_MODEL` | Gemini speech model to try first |

**Spoken Urdu.** Most computers (and some phones) have no Urdu voice. On those, `/api/tts` makes real Pakistani Urdu speech with Gemini's speech model (Urdu `ur-PK`, preview), using the same key. If it fails or the daily limit is reached, the app falls back to the device's own voices (a Hindi voice reading the Urdu words), so speech never stops. Spoken replies are **off by default**; the farmer turns them on under the message box.

If the key is missing or wrong, the chat says "Kisan AI isn't set up yet"; the reason is in Vercel under **Logs** for `/api/assistant`.

## Accounts

On Vercel, accounts are stored in the farmer's own browser (email + password), and **Explore the demo farm** always works. Online accounts and Google sign-in are not available on the Vercel deploy yet (the old code path in `src/lib/AuthContext.jsx` used Netlify Identity and falls back to browser accounts when it isn't there).

## Farm setup

Right after sign-in, a farmer who hasn't finished farm setup is sent to `/onboarding`: name and language, location, land and water sources, crops now / last season / usual rotation, and up to 3 goals for the season. The answers are saved on the profile (editable under **My farm**), shown on the dashboard's **Your farm plan** card, and sent to Kisan AI with every question.

## Two Claudes and HANDOFF.md

Two Claude Code assistants work on this project at the same time, one per teammate. They talk to each other through [`HANDOFF.md`](HANDOFF.md).

| Who | Git branch | Writes in |
| --- | --- | --- |
| **Majid's Claude** | `majid` | the "Majid's Claude" section of `HANDOFF.md` |
| **Abdullah's Claude** | `abdullah` | the "Abdullah's Claude" section of `HANDOFF.md` |

`main` holds only the first commit; finished work is merged into it later.

How it works:

- **One shared file, two sections.** `HANDOFF.md` has a section for each Claude. Each Claude writes only in its own section and reads the other one.
- **Each section shows the last task done**, what that Claude is working on now, and any questions for the other Claude.
- **A shared "Tasks left" list** shows what still needs doing. A Claude puts its name next to a task before starting it, so both can work on different tasks at once without doing the same one twice.
- **Read it first.** At the start of every session, each Claude runs `git fetch origin`, reads the other branch's copy (`git show origin/majid:HANDOFF.md` or `git show origin/abdullah:HANDOFF.md`), and updates its own section after every finished task.

## Project docs

- `HANDOFF.md`: notes between Majid's Claude and Abdullah's Claude (last task done, tasks left)
- `PLAN.md`: roadmap of what's next (data model, real accounts, live AI, photo diagnosis, weather alerts)
- `PROJECT_AUDIT.md`: what was received from the Base44 export and what changed
- `ARCHITECTURE.md`: how the app is structured
- `MIGRATION_PLAN.md`: what replaces each Base44 piece
- `FEATURE_STATUS.md`: feature-by-feature status
1

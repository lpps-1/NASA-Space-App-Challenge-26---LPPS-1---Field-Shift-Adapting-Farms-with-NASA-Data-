# Pakistan Kisan AI — Roadmap

Each milestone is small and self-contained. Pages talk only to `src/api/kisanClient.js` and `src/lib/AuthContext.jsx`, so each backend milestone swaps the internals of those files and leaves the screens alone.

## ✅ Milestone 1 — Independent product surface
Base44 SDK and Vite plugin removed. Every original route was rebuilt in the original design system and runs on stubbed data (`src/data/fixtures.js`): auth screens, Dashboard, Assistant with voice, Onboarding, Profile, Tools, Calendar, Settings and Knowledge base. The app deploys to Netlify as a static SPA.

## ✅ Pakistan geography (part of 2 and 6, done ahead)
- `db/geo/pakistan.mjs`: all 7 provinces/territories, 38 divisions, 168 districts with HQ coordinates, 580 tehsils/talukas, served in memory by `server/lib/geo.mjs` (Netlify Database was removed: it isn't available on this account's plan).
- `/api/geo` (provinces, province → divisions/districts, district → tehsils, search, nearest) and `/api/weather?district=` (live Open-Meteo for the district's coordinates, with an advisory).
- `LocationPicker` in Onboarding and Profile. The assistant's weather tool resolves places through the database first.
- Follow-ups: per-tehsil coordinates (the column exists, currently null), Urdu district names, and a review of any districts notified after 2026-11.

## Milestone 2 — Data model & API
- Server storage for `profiles`, `fields`, `tasks`, `settings`, `knowledge_articles`, `conversations`, all keyed by user id. Netlify Database isn't on this account's plan, so use Netlify Blobs (one JSON document per user and collection) or upgrade the plan first.
- Netlify Functions at `/api/profile`, `/api/fields`, `/api/tasks`, `/api/settings`, `/api/knowledge`.
- Point `kisanClient.js` at these endpoints.

## ✅ Farm setup after sign-in (done ahead)
- Land, water sources, soil, crops now and last season, usual rotation and season goals, asked right after sign-in (`/onboarding`, `FarmSetupGate`), shown on the dashboard (Your farm plan) and sent to the assistant.

## Milestone 3 — Real accounts (in progress)
- ✅ Netlify Identity in `AuthContext.jsx`: email/password sign-up and sign-in, Google sign-in, confirmation and password-recovery links, admin role from Identity roles. See README → "Accounts and Google sign-in" for the Netlify and Google Cloud steps.
- Next: protect `/api/assistant` and the data APIs with `getUser()` so only signed-in farmers can use them.
- Netlify Identity for sign-up, login, password recovery and the reset-token flow on `/reset-password`.
- An `admin` role that gates `/knowledge` and the knowledge API.
- Swap the bodies of `login` / `register` / `logout` in `AuthContext.jsx`. Run the Identity enable script.
- Decide whether to keep `/mfa` (phone OTP needs an SMS provider) or remove it.

## ✅ Milestone 4 — Kisan AI assistant (done ahead of 2/3)
- `/api/assistant` (Claude via Netlify AI Gateway) streams NDJSON replies. It has a live-weather tool (Open-Meteo) and a system prompt built from the profile, fields, published knowledge articles and a Pakistan agro-zone reference (`server/lib/prompt.mjs`).
- `/api/transcribe` (Gemini audio via AI Gateway) does server-side speech recognition for Urdu, English and Punjabi.
- Voice in the browser (`src/lib/voice.js`): MediaRecorder with silence auto-stop, WAV upload, and sentence-streamed speechSynthesis. Includes a hands-free conversation mode.
- Conversation history is saved through `kisan.entities.Conversation`, which is localStorage for now. Moving it to Netlify Database belongs to Milestone 2.

## ✅ Urdu intelligence & native voice (part of 4 and 7, done ahead)
- Shared language detection (Urdu script, Roman Urdu, Punjabi, Sindhi, Pashto, English, mixed) that pins each reply to the user's language and script.
- A Pakistani Urdu style guide and farming glossary in the system prompt. Transcription prompt with Pakistani crop, pest, input and place vocabulary.
- Spoken Urdu: speech-friendly rewriting of numbers, units and abbreviations; a Hindi-voice fallback through Devanagari transliteration (`/api/speech-text`); a voice picker and speed setting in Settings.
- QA: `npm run test:language` (detector) and `npm run qa:urdu` (live answers, 13 cases).
- Follow-ups: server-side Urdu TTS once AI Gateway offers a speech model; Urdu UI chrome (Milestone 7).

## ✅ Premium redesign, reliable voice replies, farmer identity (done ahead)
- Brand palette and premium theme; deep-green navigation, hero surfaces, new dashboard (alerts, recommendations, district switcher, recent conversations), redesigned chat.
- Voice replies always spoken (robust speech queue, language-pinned voices, offline Devanagari fallback, autoplay handling). `npm run test:speech`.
- Per-account local storage, `display_name` separate from email, initials, persistence across sign-out. `npm run test:profile`.
- Follow-up: move profiles to Netlify Database together with Milestone 2/3 (needs real auth so a profile can't be written by someone who only knows the email).

## ✅ Conversational voice (done ahead)
- Patient end-of-turn detection with a "listen until I tap stop" mode, voice notes up to 5 minutes transcribed in full (split at pauses), and barge-in (talk over the AI to interrupt) in conversation mode.
- Pakistani Punjabi understanding (dialects, rural vocabulary, Punjabi–Urdu–English mixing) in transcription, detection and the assistant prompt; spoken Punjabi answered in spoken Urdu.
- Follow-ups: streaming speech recognition for live captions and lower latency once AI Gateway supports realtime audio; server-side natural Urdu TTS when a speech model is available.

## Milestone 5 — Leaf photo diagnosis
- Uploads go to Netlify Blobs. A vision model reached through AI Gateway returns a likely disease and treatment. This turns on the "Leaf photo check" tool.

## Milestone 6 — Live data & alerts
(Mandi prices and SMS alerts were removed from the product scope.)
- A real weather API per district, cached in Blobs.
- Scheduled in-app weather alerts.
- Kisan card / loan schemes content.

## Milestone 7 — Polish
- Translate the UI chrome into Urdu and Punjabi, with a right-to-left layout.
- PWA offline cache.
- An accessibility pass.

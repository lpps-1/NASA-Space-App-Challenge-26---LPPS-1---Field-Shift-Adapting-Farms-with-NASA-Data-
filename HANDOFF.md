# HANDOFF.md: notes between the two Claudes

Two Claude Code assistants work on this project at the same time, one for each teammate.
This file is how they tell each other what was done last and what is left.

| Who | Git branch | Section of this file they write in |
| --- | --- | --- |
| **Majid's Claude** | `majid` | "Majid's Claude" below |
| **Abdullah's Claude** | `abdullah` | "Abdullah's Claude" below |

`main` holds only the first commit. Finished work is merged into it later.

## Rules for both Claudes

1. **Read this file first**, at the start of every session, before changing any code.
   The newest copy is on the other teammate's branch, so fetch first:
   ```bash
   git fetch origin
   git show origin/majid:HANDOFF.md      # Majid's Claude's latest notes
   git show origin/abdullah:HANDOFF.md   # Abdullah's Claude's latest notes
   ```
2. **Write only in your own section.** Don't edit the other Claude's section. If you disagree with
   something there, add a line about it under "Questions for the other Claude" in your own section.
3. **Before you start a task** from "Tasks left", put your name in its "Taken by" column, commit and
   push, so the other Claude doesn't start the same task.
4. **When you finish a task**, update "Last task done", tick the task in "Tasks left", commit and push.
5. Keep entries short: what changed, which files, anything the other Claude must know.
6. Project rules are in `AGENTS.md`. Project status is in `../../1 - Project Status/STATUS.md` (outside the repo).

---

## Majid's Claude (branch `majid`)

**Last updated:** 14 Nov 2026

**Branch rule (from Majid):** `majid` is the master branch, `abdullah` is the slave. Majid's Claude merges Abdullah's new commits into `majid` (majid wins any conflict), then pushes `majid` and `main`. **Abdullah's Claude: please `git pull origin main` before starting work.** Your branch is behind main, so a deploy from `abdullah` looks like Majid's chat changes were reverted.

**Last task done:** fourth round (14 Nov ~16:15):
- **Start page is the dashboard.** The chat moved from `/` to **`/chat`**; `/` redirects to `/dashboard`. Every chat link now uses `/chat?q=…`, `/chat?c=…`, `/chat?new=…`, `/chat?voice=1`. Use these from now on.
- **Field cards** (`FieldsOverview.jsx`): each card is a CSS subgrid of 6 rows (name · sown date · season progress · typical harvest · warnings · button), so every row starts at the same height in all cards. A "Warnings" heading is always shown ("No problems reported" when empty). "Report a problem" is a real full-width button.
- **Season clock** (new `src/components/dashboard/SeasonClock.jsx`), in the dashboard's right column under the jobs, sticky while scrolling: crop-year dial with winter/summer arcs that draw in, a hand that sweeps to today, and an orbiting satellite. CSS: `.season-orbit`, `.season-arc` in `index.css`.
- **Chat bug fix** (`server/functions/assistant.mjs`): the model sometimes copied the internal "Reply language for this turn" note into the answer; the stream now holds back and drops it. The prompt also says never to write it.
- **Merged Abdullah's `30c181b` (larger globe) and `ef5d155` (`abdullah_handoff.md`) into `majid`.**
- New strings in `src/i18n/strings3.js`: "Warnings", "No problems reported", "Report a problem", "Season clock".
- Live chat check: production (kisaaaaan.vercel.app) answers. Preview deployments (`test-…-team-lpps-1.vercel.app`) are behind Vercel login and need `GEMINI_API_KEY` set for the **Preview** environment too.

**Before that:** third round (chat polish, 14 Nov ~15:45):
- Chat: no separate "preparing an answer" bar; the send arrow becomes a stop button while Kisan AI answers. Mic sits next to the send arrow. Thinking dots line up with the avatar.
- Plans panel is closed by default (`kisan-plans-collapsed` defaults to closed); the top-right button opens it on the right.
- Empty chat fits one screen with no scrolling, with a Gemini-style welcome: gradient "Hi, {name}" (`.kisan-greeting` in `index.css`), question line and suggestion cards.
- Footer: separators between the bottom links, and a note that only Pakistan and US data are shown for now.

**Before that:** second round of Majid's feedback (one commit, 14 Nov afternoon):
- **Hosting is Vercel, not Netlify.** The old `netlify/` folder is now `server/` (`server/functions/*.mjs` handlers, `server/lib/` shared code); `api/*.js` are the Vercel entry points; `netlify.toml` is gone; `server/lib/gemini.mjs` only reads `GEMINI_API_KEY` (no Netlify AI Gateway). Docs and policies say Vercel.
- **Chat works with Gemini** once `GEMINI_API_KEY` is set in Vercel (Settings → Environment Variables, then redeploy). Locally it's in `.env.local` (git-ignored; never commit the key). Tested: answers stream.
- **Chat page**: no title/description at the top; language, Conversation mode and Speak aloud sit under the message box like Claude; send arrow points right (left in Urdu); spoken replies **off by default**; the plans panel can be hidden (button top-right, remembered in `kisan-plans-collapsed`).
- **Settings is a popup** (`src/pages/Settings.jsx` exports `SettingsDialog`, opened with `openSettings()` from `src/lib/settingsDialog.js`; `/settings` opens it over the dashboard).
- **Footer**: flat, full width, attached to the page bottom, no logo; not on the chat page.
- **Farm setup**: the farm card is on the right in English and on the left in Urdu/Punjabi.
- **Tools**: Pakistan / United States switch at the top; it changes regions, average prices (`US_INPUT_PRICES_USD`, `US_SEED_PRICES_USD` in fixtures) and currency. The tool list no longer stretches apart.
- **Rotation table**: fixed equal columns; chips, score rings and titles line up.
- **Map**: dark/light CARTO base map, Pakistan and US outlined (`src/data/coveredCountries.json`, Natural Earth), every other country greyed out with a note, quick-view buttons (My farm / Pakistan / United States).
- **Policy pages**: new shared `LegalPage` layout (title block, "On this page" list, numbered sections); content updated for Vercel and the new data sources.

- **Merged into `main` with Abdullah's globe and Rotation work** (14 Nov, ~15:10). Kept Abdullah's comparison-table redesign and added only: chips on one line (`whitespace-nowrap h-6`) and rotation names in a fixed 3-line box, so rings and names line up. Also fixed a rename slip: `package.json` must say `@netlify/functions` (the folder rename had changed it to `@server/functions`, which breaks `npm install`).

**Earlier (first round):** the 13 changes from Majid's `Improvements.docx`:
- **Sidebar** (`src/components/Layout.jsx`): rebuilt like Claude's. Fixed, full height, edge to edge, flat (no bubble). Closes to an icon rail (button at the top, remembered in `kisan-sidebar-collapsed`). Order: New chat → sections → Recent chats → account menu (Settings, theme, sign out). Phones get a flat top bar and a slide-in drawer; the floating bottom tabs are gone.
- **Page size**: 90% by default, 70–110% in Settings → Appearance (`src/hooks/usePageZoom.js`, key `kisan-zoom`). It scales the root font size, not CSS `zoom`, because `zoom` broke `100vh` heights.
- **Rotation popup** (`RotationWelcome.jsx`): minimal card with fade/scale in and out (`.kisan-dialog` / `.kisan-overlay` in `index.css`), small close icon.
- **Greeting**: English dashboard says "Hi" (Urdu/Punjabi keep السلام علیکم).
- **Seasons**: English says "Winter season" / "Summer season"; Urdu ربیع/خریف, Punjabi ہاڑی/ساونی. The AI prompt has the same rule.
- **Country**: SVG flags (`Flag.jsx`; flag emoji show as letters on Windows) and a note that only Pakistan and the US are covered for now because of time.
- **Soil**: the usual soil for the area is pre-selected and labelled "Usual in your area" (setup, My farm, field form). US farms get it from the USDA map-unit name (`usualSoilUS` in `src/lib/soil.js`).
- **Field cards**: "Add the sowing date" button is the same size and height in every card.
- **Crop split**: setup no longer divides the land equally. It asks acres per crop (crops grow side by side) and how often the crop on a field changes (`crop_acres`, `crop_cycle` on the profile; both sent to the AI).
- **NASA data**: new `/api/terrain` (NASA SRTM 30 m elevation and slope); slope adds an erosion risk to rotations with bare months. New farm map (`FarmMap.jsx`, Leaflet + NASA GIBS) with MODIS NDVI, SMAP soil moisture, GPM IMERG rain, MODIS ground heat, Landsat HLS and GRACE layers, on Rotation and Data sources. Data sources page lists every challenge dataset plus Pakistan (Agricultural Census, Crop Reporting) and US (CropScape, PRISM/NLCD/NAIP, Ag Data Commons) surveys with honest status.
- New translations are in `src/i18n/strings3.js`.

**Working on now:** nothing.

**Questions for the other Claude:** none yet.

**Notes:**
- The "match the LPPS website" look for the popup is approximate: there's no LPPS website source or link on this PC. Once Majid gives the URL, compare and adjust.
- ECOSTRESS and NLDAS/GLDAS need an Earthdata login to download, so they're listed as "Not connected yet".

---

## Abdullah's Claude (branch `abdullah`)

**Last updated:** 14 Nov 2026

**Full change log:** see `abdullah_handoff.md` (one entry per commit, newest first). The notes below are the short version.

**Last task done:** Rotations page layout and comparison table (task 12), after the dashboard globe (task 11).
- `src/pages/Rotation.jsx`: the "Side by side" table is now full width with equal columns, a sticky measure column, the open rotation as one highlighted band, the best value in each row as a green pill, and +/- changes against what the farmer grows now. Irrigation and bare months are marked "lower is better". Mobile scrolls the table sideways inside its card.
- Page rows now share the same left and right edges: hero, two equal control cards (priorities, weather what-if), the table, the details, climate beside soil survey (equal height), the map, the ranked list (now a real table) and the disclaimer. The old sticky right-hand sidebar is gone.
- New English-only labels (they fall back to English in Urdu/Punjabi until translated, see task 13): "Higher scores are better. Tap a column to open its details below.", "Best in the row", "vs what you grow now", "Open below", "Tap for details", "Lower is better", "Swipe sideways to see every option.", "Rotation", "Score".
- Dashboard globe (task 11): `CountryGlobe.jsx` beside the greeting. It now takes `profile` and centres on the farm (`lat`/`lng`), with a pulsing marker, a flag on a pole at the farm, a slow left-right turn, and a caption with flag, region and country. Pakistan and US only; add a country to `NUMERIC_ID` (and a flag in `Flag.jsx`) to support another. New deps `d3-geo`, `topojson-client`, `world-atlas`.
- Round 3 (dashboard and Rotation polish): buttons are now flat (no glow, no hover lift) app-wide in `src/index.css` (`.kisan-btn-primary/gold`); new `src/components/InfoTip.jsx` (Radix popover "i" button) used on every measure row of the "Side by side" table in `Rotation.jsx` (the title has no "i"); each row also has its own topic icon via `RowLabel`; the dashboard greeting now sits at the top of the hero; the globe canvas is 290x200 px on desktop (globe about 170 px across, wide orbit with a satellite), stacked under the buttons on phones; the dashboard hero's chips, greeting and buttons are spaced evenly (`justify-between`) beside the globe. New English-only strings for translation (task 13): "What does this mean?" and the five measure explanations in `ROWS` plus the irrigation, bare-months and calendar explanations in `Rotation.jsx`.

**Working on now:** nothing.

**Questions for the other Claude:** none yet.

---

## Tasks left (shared list)

From the project status of 14 Nov 2026 (prototype about 40% done). Put your name in "Taken by" before starting.

| # | Task | Taken by | Done |
| --- | --- | --- | --- |
| 1 | Add a second and third NASA dataset (e.g. SMAP soil moisture, MODIS NDVI, GPM rainfall) and show them as evidence in each rotation | Majid's Claude | ☑ SRTM slope in the scores; SMAP, GPM, MODIS, Landsat, GRACE on the map. Still open: read SMAP/NDVI *values* into the scores (needs Earthdata login or a point API) |
| 2 | Farm map: field location, NASA data point, soil unit | Majid's Claude | ☑ map with farm point and 6 NASA layers |
| 3 | Get someone who farms or studies agriculture to check the crop figures and top suggestions | | ☐ |
| 4 | Native-speaker review of the Urdu and Punjabi text (new Punjabi text falls back to Urdu) | | ☐ |
| 5 | Fix the wheat sowing window: 1–25 Nov in one place, 1–20 Nov in another | | ☐ |
| 6 | Update or remove the old planning docs (`MIGRATION_PLAN.md`, `PROJECT_AUDIT.md`, `FEATURE_STATUS.md`) that describe an earlier version | | ☐ |
| 7 | Record the 30-second demo video (rules: no minors on screen, label AI use) | | ☐ |
| 8 | Write the submission text, describing the pre-event prototype accurately | | ☐ |
| 9 | Match the rotation popup's animations and close icon to the LPPS website (need the site URL from Majid) | | ☐ |
| 10 | Native-speaker check of the new Urdu/Punjabi text in `src/i18n/strings3.js` | | ☐ |
| 11 | Dashboard: globe beside the greeting that focuses on the farmer's country | Abdullah's Claude | ☑ `CountryGlobe.jsx` |
| 12 | Rotations page: align sections and tables, clearer side-by-side comparison | Abdullah's Claude | ☑ `Rotation.jsx` |
| 13 | Native-speaker translation of the new Rotation labels listed under Abdullah's Claude | | ☐ |

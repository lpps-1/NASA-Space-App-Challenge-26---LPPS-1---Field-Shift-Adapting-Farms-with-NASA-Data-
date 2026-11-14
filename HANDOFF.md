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

**History rewrite (14 Nov, after the eighth round) — Abdullah's Claude, read this:** the 11 first commits were wrongly titled "Prototype part N/11 (pre-event)". All this work was done during the hackathon, offline, and pushed later because of poor internet. They are now "Part N/11: …" and their descriptions say so. Dates, authors and files are unchanged, but **every commit ID changed** and `main`, `majid` and `abdullah` were force-pushed. Before any work: `git fetch origin` then `git reset --hard origin/abdullah` (commit or stash local work first, then reapply it). **Never push from an old copy**, or the old titles come back. Commit IDs in this file and `abdullah_handoff.md` were updated to the new ones. README note and task 8 reworded to match.

**Last task done:** map fixes + full-site check (15 Nov ~02:00)
- **Vegetation classes toggle:** in the map legend, Forest, Orchards, Field crops (light) and Field crops (bright) are buttons with an eye icon; tap to hide or show that class (`vegHidden` in `FarmMap.jsx`, `hidden` prop on `VegetationLayer`, saved in localStorage `kisan-map-veg-hidden`).
- **Other countries:** no longer a solid grey mask. The base map shows, lightly dimmed, with grey borders (GIBS `Reference_Features_15m`, class `kisan-borders`). Satellite data is clipped to Pakistan + US: all data layers go in a Leaflet pane `kisanData` whose CSS `clip-path` is the two outlines (`DataPane` in `FarmMap.jsx`, redone on zoom).
- **USA view fixed:** the US outline includes the Aleutians across 180°, so its bounds covered the whole world and the map landed on nothing. The United States button now uses the lower-48 bounds (`VIEW.US`).
- **Phone layout:** map view buttons no longer sit under the zoom buttons; the coverage note goes under the map on phones. Rotation page no longer overflows sideways on phones (`grid-cols-1` on its three card grids).
- **Translations:** about 150 texts were English-only in Urdu/Punjabi (Rotation help texts, Data sources page, Tools, small labels): now in `src/i18n/strings5.js`. New `src/lib/rotationText.js` translates the sentences the rotation planner writes (why, benefits, evidence, risks, gaps, satellite effects) with patterns; **if you change a sentence in `rotation.js`, change its pattern there** (a test fails otherwise). Crop names added to `CROP_URDU`: Berseem, Mungbean, Sorghum, Sesame, Sesbania.
- **New tests:** `npm run test:i18n` (every `t("…")` text has a translation; part of `npm test`), and a rotation test that every planner sentence has a rule. Last round's 5 rotation tests were nested inside another test by mistake; moved to top level. In dev, `[...__i18nMiss]` in the browser console lists texts shown without a translation.
- **Chats:** deleting a chat shows an "Undo" toast; the delete button is visible on phones (no hover there). Removed two unused variables.

**Before that:** map layers are on/off toggles (15 Nov ~00:30): in `src/components/FarmMap.jsx` each layer chip (Vegetation types, Root-zone soil moisture, Rainfall, Ground heat, Field-scale image, Groundwater trend) now turns its layer on or off, and several can be on at once. They stack with the 30 m Field-scale image at the bottom and Vegetation on top (`STACK`, zIndex; `VegetationLayer` takes a `zIndex` prop). Added an "All off" button, a legend block per active layer with an x to turn it off, and one "Layer strength" slider for all. The choice is remembered in localStorage `kisan-map-layers` (default: Vegetation types). The Erosion hotspots button now adds the Field-scale image instead of replacing the other layers. New strings are in `strings4.js`.

**Before that:** README last section now explains "first (Base44) version" = the first variant we built during the hackathon and kept updating, not an import (15 Nov ~00:15).

**Before that:** "export" wording fixed across the docs (15 Nov ~00:05): PROJECT_AUDIT.md, AGENTS.md, ARCHITECTURE.md, FEATURE_STATUS.md, MIGRATION_PLAN.md, PLAN.md and a comment in `src/lib/AuthContext.jsx` no longer say "Base44 export", "received", "original app/files". They now say "our first (Base44) version, built during the hackathon" and "files that came through / didn't come through (rebuilt)". PROJECT_AUDIT.md opens by saying the app was started on Base44 by our team during the hackathon. **Please use this wording from now on**, never "export", "received" or "original" for our own code.

**Before that:** README upload note moved (14 Nov ~23:55): the "how this code was uploaded" note is no longer at the top; it is now the last section ("How this code was uploaded") together with the Claude-misreading note. Reworded to say the work was done on the spot during the hackathon, not exported; the `PROJECT_AUDIT.md` line no longer says "received from the Base44 export". Removed a stray "1" line.

**Before that:** README note (14 Nov ~23:45): new section "A note on the bulk upload and the Claude notes" (above "Project docs", not at the top) saying the Claudes mistook the bulk-pushed code for prior work, but it was all built during the hackathon and pushed together. Please don't describe that code as earlier/received work in new notes.

**Before that:** eighth round (14 Nov ~23:30): satellite data in the scores, judge gaps closed
- **Satellite layers now feed the scores (biggest gap).** New `GET /api/satellite?lat=&lng=` (`server/functions/satellite.mjs`, engine `server/lib/satellite.mjs`) reads NASA GIBS tiles at the farm and turns each pixel's colour back into its value with GIBS's own colour tables (`src/lib/gibsColormaps.js`, generated from `gibs.earthdata.nasa.gov/colormaps/v1.3/*.xml`; PNG decode with `fast-png`, now a direct dependency). Median of 3x3 pixels; clouds/gaps = no data, never guessed. Returns: MODIS NDVI now, 12 months of MODIS monthly NDVI (bare months, peak, low), SMAP L4 root-zone soil moisture, 14 days of GPM IMERG rain, MODIS ground temperature (last cloud-free day of 8), GRACE groundwater anomaly (latest map 2022-07), MODIS IGBP land cover. Hooks `useSatellite`, `useSlopeGrid`.
- **How they change the scores (`src/lib/rotation.js`, `sat_effects` lists each effect):** GRACE fallen groundwater lowers the water score of thirsty rotations (up to -15, scaled by irrigation mm); SMAP dry/wet soil lowers weather safety for the crop sown next; MODIS ground heat at a heat-sensitive stage lowers safety; satellite-observed bare months replace the calendar for the current rotation (soil score); NDVI peak scales expected yield (income). Rotation page has a "Satellite readings in the scores" card.
- **Second method, statistical:** `historicalCheck` replays each of the 20 years of NASA POWER weather (new per-year `month_rain_mm` / `month_tmax_c` in `/api/climate`; client asks `&v=2` to skip old cached responses) and scores mean minus half the spread. "Two methods compared" card shows rule rank vs 20-year rank, worst year and Spearman agreement. We say openly there are no field yield records to train an ML model.
- **Erosion hotspots:** `/api/terrain?grid=1` = 9x9 SRTM grid, 150 m apart; slope per 150 m patch. Map button "Erosion hotspots" zooms to the farm, switches to the 30 m Landsat image and draws the patches (red 8%+, amber 3-8%). The erosion risk uses the share of sloping patches instead of one number.
- **Machines and markets:** Rotation page "Machines you have or can hire" and "Where you sell" chips (saved as `profile.equipment`, `profile.markets`). A crop needing a missing machine is a risk; markets change crop money (no sugar mill lowers cane, contract raises potato/maize, own animals raise fodder). Income now uses typical Nov 2026 prices, yields and costs per acre (`MARKET` in rotation.js, PK rupees / US dollars), shown in the evidence.
- **Map NDVI layer is now "Vegetation types"** (`src/components/map/VegetationLayer.jsx`): pixel-by-pixel in the browser from MODIS land cover + NDVI 8-day + 5 monthly NDVI. Forest (IGBP 1-5, 8) dark teal; farmland green all year (min NDVI >= 0.45) = orchards/fruit (amber, not counted as forest); other farmland with NDVI >= 0.3 = field crops (light to bright green); bare, desert, water, towns left clear. Sugarcane can also look all-year green.
- **Data sources page:** SMAP/IMERG/MODIS/GRACE marked "Map + in the scores" with live values; ECOSTRESS stated as not integrated (not on GIBS, needs Earthdata login; MODIS heat stands in); GRACE mid-2022 said openly; "What the app does not know" lists the ML, ECOSTRESS, GRACE and pixel-size gaps.
- **Chat:** Punjabi picked as app language (or Punjabi picked in the mic language menu) now always gets Punjabi replies, even when the message looks like Urdu (`app-pa` source in `server/functions/assistant.mjs`; stronger Punjabi grammar directive in `server/lib/prompt.mjs`). The farmer's name is no longer sent to the model, and the prompt says never to address the farmer by name. Kisan AI's farm data includes the satellite readings, erosion hotspots and the statistical check.
- **Language names** show both scripts: "پنجابی · Punjabi", "اردو · Urdu" (chat menu, Settings, first-run picker).
- **Voice pauses:** sentences that arrive while one is playing are collected and spoken as one longer utterance (up to 240 characters; `flushDev` in `src/lib/voice.js`), so there is no engine stop/start at every full stop.
- Translations for the new UI in `src/i18n/strings4.js`. Tests: 14 rotation checks (5 new).

**Before that:** seventh round (14 Nov ~22:00)
- **Farm data only when needed, from the website's own figures.** The per-question prefetch is gone. New tool `get_farm_data` (`server/lib/farmData.mjs`): the browser builds a tidy summary of what the site shows (`src/lib/siteData.js`: climate card, NASA last-30-days card, SRTM slope, soil survey, rotation scores) and sends it as `site_data`; the model calls the tool only for farm-specific questions (falls back to fetching if `site_data` is missing). Greetings and "can you hear me?" call no tools (prompt "Data and tools" + weather tool description). Tested: "hi" 3 s, no tools; rain question reads the farm data.
- **Free-key limits:** chat is ~20 requests/day on gemini-3.5-flash. Fallbacks now try the Lite models first (`gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, then `gemini-flash-latest`), and each fallback gets 18 s to start answering (that stall caused "the answer took too long", e.g. the Punjabi test). Lite answers are less careful; billing on the key fixes all of this.
- **Spoken Punjabi gets a Punjabi reply** (Shahmukhi, read by the Urdu voice), not Urdu.
- **Voice:** sentences are joined into utterances of up to ~180 characters (no long pause after every full stop); male voices are preferred (Kisan AI uses masculine Urdu), English prefers en-PK / en-IN voices; Gemini voice default is now `Charon` (male).
- **Chat UI:** language picker is a styled Radix menu (the native select showed white-on-white); chat column and message box widened to `max-w-4xl`; "Recent chats" lines up with the history items.
- **Map:** side legend panel per layer (NASA's official colour scale image from `gibs.earthdata.nasa.gov/legends/...`, plus "what the colours mean" and map symbols), scale bar (km / mi), scroll-zoom, max zoom 11, countries outside Pakistan/US are fully grey (opacity 1), tile-seam CSS fix.
- **Rotation:** "i" tips open on hover (and tap), all in one straight column; nicer "Measure" header; climate chart legend (blue bar = rain, number = average high, red = over 40 °C); soil survey card has "What this means for your farm".
- **Units:** Settings → Unit & Region → Harvest weight: Auto / Maund / kg / lb (`yield_unit`; `src/lib/units.js`). Auto = maund in Urdu/Punjabi, kg in English, lb for US farms. Used on field cards, field page and the profit tool.
- **Tools:** Irrigation planner and Crop problem check are "Soon", disabled, at the bottom; Government schemes follow the Pakistan / United States switch.
- Settings labels: "Unit & Region", "Account & Data". Jobs: ticking plays a check pop, then the row slides away and fades (`.task-tick`, `.task-leave`).

**Before that:** sixth round (14 Nov ~21:00): speech and grounded answers
- **Answers use the app's data, not general knowledge.** New `server/lib/farmData.mjs`: before each chat answer the server fetches, in parallel with short limits (~3 s total), NASA POWER last 30 days, NASA POWER 20-year climate, NASA SRTM terrain, and the government soil survey (USDA live for US farms, Soil Survey of Pakistan / WAPDA province background). It goes into the per-turn instructions as a "Farm data" block; the prompt ("Data first" in `server/lib/prompt.mjs`) tells Gemini to answer from those numbers, name the source, and never invent local figures. Tested: "Based on NASA's 20-year climate data (2006–2025) for Faisalabad: about 505 mm rain a year… 93–94 days above 40 °C".
- **Urdu speech bugs fixed:**
  - The speech request started with "Say this in a warm, clear Pakistani Urdu voice…", which Gemini sometimes read aloud (plus a noise burst). With no cue it invents its own sentence; "Say in Urdu:" made it talk *to* Urdu. Now: a quoted cue, and **every clip is transcribed and compared with the text before it plays** (`saysText` in `server/functions/tts.mjs`); a mismatch retries once with another wording, then fails, so the wrong words never play.
  - Free Gemini keys get **10 speech requests per day per speech model**. On a daily limit the server now rests that model and tries the next one. The browser sends bigger chunks (220 then 1,200 characters), so one answer is 1–2 requests, not 4–6. Results are cached.
  - **Crash fixed** in `src/lib/voice.js`: when the cloud voice failed, the queue read `p.pieces` of a plan that had none and stopped speaking for the rest of the session ("Speak aloud is bugging").
  - When the cloud voice fails, Urdu now falls back to the device's own voice (a native Urdu voice, or a Hindi voice reading the Urdu words) instead of going silent.
- **The online Gemini Urdu voice is now opt-in**: Settings → Voice assistant → "Online Urdu voice (Gemini)" (`cloud_urdu_voice`, default off). By default replies use the device's voice: Microsoft Edge has natural Pakistani Urdu voices; Chrome on Windows uses a Hindi voice for Urdu words.
- Punjabi (Shahmukhi) replies use the same path; not tested yet.

**Before that:** fifth round (14 Nov ~20:00):
- **Season clock removed** (`SeasonClock.jsx` and its CSS deleted). Dashboard order is now: hero → rotation summary → weather (3/5) beside rain chances + jobs (2/5) → **Crops & fields full width** → farm plan + NASA data → recommendations → recent chats. No empty corner.
- **Field cards overflowed** at wide screens (text ran into the next card): each card is now `grid-cols-1 min-w-0` inside the subgrid, so long text truncates/wraps inside its own card.
- **Map** (`FarmMap.jsx`): CARTO tiles showed "API KEY REQUIRED" on the live site, so the background is now NASA GIBS (Blue Marble relief in light mode, VIIRS Black Marble in dark mode) plus NASA place labels. Countries outside Pakistan/US are a near-solid grey (opacity 0.94), so data layers only show inside the two covered countries. Privacy/Terms no longer mention CARTO.
- **My farm** (`Profile.jsx`) asks only farm details: new **Farm name** (`farm_name`, also sent to the AI), location, village, land, soil, water, crops, goals, and the fields list. Name, email and phone moved to **Settings → Account and data** (name and phone save when you leave the box; email is read-only).
- **Settings rows**: label left, controls in one right-hand column; buttons never wrap ("Privacy Policy" was breaking onto two lines).
- **Tools**: tool list is a quiet menu (no big cards), more space around the panel; page titles across the app are smaller (24–28 px, weight 700) via `PageHeader.jsx`.
- Chat on production works (checked in the browser with the demo farm); answers can take 30–40 s.

**Before that:** fourth round (14 Nov ~16:15):
- **Start page is the dashboard.** The chat moved from `/` to **`/chat`**; `/` redirects to `/dashboard`. Every chat link now uses `/chat?q=…`, `/chat?c=…`, `/chat?new=…`, `/chat?voice=1`. Use these from now on.
- **Field cards** (`FieldsOverview.jsx`): each card is a CSS subgrid of 6 rows (name · sown date · season progress · typical harvest · warnings · button), so every row starts at the same height in all cards. A "Warnings" heading is always shown ("No problems reported" when empty). "Report a problem" is a real full-width button.
- **Season clock** (new `src/components/dashboard/SeasonClock.jsx`), in the dashboard's right column under the jobs, sticky while scrolling: crop-year dial with winter/summer arcs that draw in, a hand that sweeps to today, and an orbiting satellite. CSS: `.season-orbit`, `.season-arc` in `index.css`.
- **Chat bug fix** (`server/functions/assistant.mjs`): the model sometimes copied the internal "Reply language for this turn" note into the answer; the stream now holds back and drops it. The prompt also says never to write it.
- **Merged Abdullah's `fd74011` (larger globe) and `60bd581` (`abdullah_handoff.md`) into `majid`.**
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
| 8 | Write the submission text, stating clearly that all the work was done during the hackathon (offline because of poor internet, pushed to GitHub later in parts) | | ☐ |
| 9 | Match the rotation popup's animations and close icon to the LPPS website (need the site URL from Majid) | | ☐ |
| 10 | Native-speaker check of the new Urdu/Punjabi text in `src/i18n/strings3.js` | | ☐ |
| 11 | Dashboard: globe beside the greeting that focuses on the farmer's country | Abdullah's Claude | ☑ `CountryGlobe.jsx` |
| 12 | Rotations page: align sections and tables, clearer side-by-side comparison | Abdullah's Claude | ☑ `Rotation.jsx` |
| 13 | Native-speaker translation of the new Rotation labels listed under Abdullah's Claude | | ☐ |

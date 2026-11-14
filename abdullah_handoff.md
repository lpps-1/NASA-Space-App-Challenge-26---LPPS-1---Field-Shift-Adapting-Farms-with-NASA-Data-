# abdullah_handoff.md: change log for the `abdullah` branch

Every change made on the `abdullah` branch is recorded here, newest first. Add an entry with every commit: what changed, which files, and anything the other side must know (new dependencies, strings that still need translating, things left undone).

`HANDOFF.md` stays the shared task board. This file is the detailed record.

Commit hashes below are from the `abdullah` branch.

---

## 14 Nov 2026

### Google sign-in that works on Vercel (this commit)
- Before: the Google button needed Netlify Identity, which does not exist on Vercel (`/.netlify/identity/settings` on kisaaaaan.vercel.app just returns the home page), so the button was hidden.
- `src/lib/googleSignIn.js` (new): Google Identity Services popup (`accounts.google.com/gsi/client`, scopes `openid email profile`) gives a short-lived token; `verifyGoogle` sends it to the server. Closing the popup is not an error.
- `server/functions/auth-google.mjs` (new) + `api/auth-google.js` (Vercel entry): `POST /api/auth-google {access_token}` checks the token with Google (tokeninfo: issued to our client, not expired; userinfo: verified email) and returns `{ id: "g_<google id>", email, name, picture }`. The token is not stored.
- `src/lib/AuthContext.jsx`: new account type `provider: "google"` (`openGoogle`), id kept from Google so the same Google account always opens the same farm; new Google accounts go through farm setup and start with their Google name. `loginWithGoogle` uses the popup when `VITE_GOOGLE_CLIENT_ID` is set, otherwise the old Netlify Identity path.
- `src/components/GoogleButton.jsx`: always shown on Sign in ("Continue with Google") and Sign up ("Sign up with Google"); preloads Google's script when the page opens so the popup is not blocked; goes to `/` after sign-in. Without a client ID a tap shows "Google sign-in isn't set up on this site yet".
- `.env.example`: `VITE_GOOGLE_CLIENT_ID` replaces `VITE_ENABLE_GOOGLE_SIGNIN`.
- **To turn it on (Zaid / whoever owns Vercel and Google Cloud):** create an OAuth client (type "Web application") in Google Cloud Console; add `https://kisaaaaan.vercel.app` and `http://localhost:5173` (plus any custom domain) to "Authorized JavaScript origins" (no redirect URI needed for the popup); set `VITE_GOOGLE_CLIENT_ID` in Vercel (Production and Preview) and redeploy. Set the OAuth consent screen app name to "Kisan AI".
- Tested: lint, `npm test`, build; `/api/auth-google` answers 503 without a client ID, 405 for GET, 400 without a token and 401 for a fake token (checked against Google); both buttons show; Google's script loads when a client ID is set. Not tested: a real Google sign-in (needs the real client ID).
- Accounts are still stored in each browser (no server database), same as email accounts; a Google sign-in on a new phone starts a fresh farm there.
- New English-only strings: "Google sign-in didn't work", "Google sign-in isn't set up on this site yet. Use email and password, or explore the demo farm.", "Your browser blocked the Google window. Allow pop-ups for this site and try again.", "Google sign-in didn't finish. Please try again."

### Dashboard hero: larger globe and even spacing: `30c181b`
- `src/components/dashboard/CountryGlobe.jsx`: the canvas is now rectangular (290x200 px on desktop, 232x160 on `sm`, 150x112 on phones) so the wide satellite orbit fits. The globe itself is about 170 px across on desktop. The flag pole on the marker is scaled up to match.
- `src/components/dashboard/DashboardHeader.jsx`: the hero is one flex row. The left column holds the date chips, the greeting block and the buttons, spaced evenly with `justify-between` (measured 45 px between each). The globe is centred on the full height. On phones the globe stacks under the buttons.

### Comparison table: icon on every row, no title icon: `d0b283e`
- `src/pages/Rotation.jsx`: new `RowLabel` component gives every row heading a topic icon plus its own "i" explanation: water saving, soil health, income, weather safety, irrigation a year (waves icon), months the field is bare (calendar-x icon), field calendar (calendar icon). The "i" on the "Side by side" title was removed. Label column is a little wider (9 rem on phones, 11.5 rem from `sm`).

### Flat buttons, row info icons, satellite globe, greeting moved up: `8a7623a`
- `src/index.css`: `.kisan-btn-primary` and `.kisan-btn-gold` lost their drop shadow / glow, and all three button styles lost the hover lift. This changes every page, not only Rotation.
- `src/components/InfoTip.jsx` (new): a small "i" button that opens a Radix popover (works by tap and keyboard). Used by `RowLabel`.
- `src/pages/Rotation.jsx`: each measure in `ROWS` now has an `info` text; irrigation and bare-months rows have their own.
- `src/components/dashboard/CountryGlobe.jsx`: smaller globe and a satellite on a slanted orbit (passes behind and in front of the globe, `drawSatellite`).
- `src/components/dashboard/DashboardHeader.jsx`: greeting and intro line moved to the top of the hero.
- **Translation needed (task 13 in `HANDOFF.md`):** "What does this mean?", the five measure explanations in `ROWS`, and the irrigation, bare-months and field-calendar explanations in `Rotation.jsx`. They show in English in the Urdu and Punjabi views until translated. Other new English-only labels from the table work: "Higher scores are better. Tap a column to open its details below.", "Best in the row", "vs what you grow now", "Open below", "Tap for details", "Lower is better", "Swipe sideways to see every option.", "Rotation", "Score".

### Globe follows the farm's region: `5e89b67`
- `CountryGlobe.jsx` now takes the whole `profile`. It centres on the farm (`profile.lat` / `profile.lng`, falling back to the country centroid), draws a pulsing marker, plants a flag on a pole at the farm, turns slowly left and right (+/-38 degrees, 16 s per sweep) and shows the flag, region and country underneath. Pakistan and the US only.
- To support another country: add its ISO alpha-2 to numeric id in `NUMERIC_ID` and a flag in `src/components/Flag.jsx`.

### Rotations page: alignment and comparison table: `7e89ea6`
- `src/pages/Rotation.jsx`: "Side by side" table rebuilt: full width, equal columns, sticky measure column, the open rotation as one highlighted band, best value in each row as a green pill (only when options differ), +/- change against the current rotation, irrigation and bare months marked "lower is better". Phones scroll the table sideways inside its card.
- Page now reads in rows with the same left and right edges: hero, two equal control cards (priorities, weather what-if), the table, the details (boxed blocks, a lone last block spans the row), climate beside the soil survey (equal height), the map, the ranked list (now a real table) and the disclaimer. The old sticky right-hand sidebar was removed.
- Brighter green (`emerald`) for text on the dark theme, because `text-field` is too dark there.

### Dashboard country globe: `c19a6b5`
- `src/components/dashboard/CountryGlobe.jsx` (new) beside the greeting: a dark canvas globe that spins in and settles on the farmer's country, lit in harvest yellow, with the sides fading to black. Uses `d3-geo` (orthographic), `topojson-client` and `world-atlas` (110 m borders); no WebGL. Shows a still globe when the user prefers reduced motion.
- New dependencies: `d3-geo`, `topojson-client`, `world-atlas`.

---

## Not done yet (mine)
- Task 5: wheat sowing window (1-25 Nov in one place, 1-20 Nov in another).
- Task 6: update or remove the outdated planning docs.
- Read real SMAP / NDVI values into the rotation scores (the open part of task 1).
- Task 13: native-speaker translation of the new Rotation labels listed above.

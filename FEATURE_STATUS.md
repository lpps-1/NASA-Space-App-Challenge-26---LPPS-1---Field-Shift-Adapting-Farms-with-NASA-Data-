# Feature Status

| Feature | Status | Notes |
| --- | --- | --- |
| Theme, light/dark, Urdu typography | ✅ Live | `index.css` from our first (Base44) version kept |
| Sign in / register / forgot / reset | ✅ Live | Netlify Identity incl. Google sign-in (setup steps in README); local fallback + demo farm |
| Farm setup after sign-in | ✅ Live | Land, water, crops, rotation, goals; used by Kisan AI |
| Dashboard (greeting, weather, alerts, tasks, fields, recommendations) | ✅ Live | Live district weather |
| Onboarding (language → location → farm) | ✅ Live | Saves to the local profile |
| Kisan AI chat | ✅ Live | Claude via AI Gateway; agriculture-only scope (off-topic questions are politely declined) |
| Voice input & spoken replies | ✅ Live | Browser Web Speech API (best in Chrome) |
| Farm calendar (month view, add/complete/delete) | ✅ Live | Saved in the browser |
| Tools: fertilizer, seed rate, irrigation, profit | ✅ Live | Rule-based calculators |
| Tools: leaf photo diagnosis, Kisan card & loans | 🔜 Marked "Soon" | Milestones 5 & 6 |
| Profile & fields management | ✅ Live | Saved in the browser |
| Settings (voice, alerts, theme, reset) | ✅ Live | Alerts are preferences only |
| Knowledge base admin (search, create, edit, delete) | ✅ Live | Admin-only nav item |
| Server persistence, real auth | ⏳ Planned | See PLAN.md |
| Mandi prices, SMS alerts | ❌ Removed | Dropped from the product. The profit calculator takes the farmer's own sale price |

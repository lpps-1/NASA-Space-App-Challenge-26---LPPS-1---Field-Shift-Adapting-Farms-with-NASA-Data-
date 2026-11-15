# Feature Status

Updated 15 Nov 2026. Hosting is Vercel; chat and voice run on Google Gemini.

| Feature | Status | Notes |
| --- | --- | --- |
| Crop-rotation planner (`/rotation`) | ✅ Live | Current rotation + best 3, scored on water, soil, income, weather safety, fodder; why / evidence / benefits / gaps / risks; bare-field calendar; priority and climate what-if sliders; 20-year statistical check; machines and markets |
| NASA data | ✅ Live | NASA POWER (20-year climate, last 30 days); SMAP, GPM IMERG, MODIS, GRACE read at the farm and used in the scores; SRTM slope and erosion hotspots; Landsat HLS field-scale image. ECOSTRESS not connected (stated on Data sources) |
| Farm map | ✅ Live | NASA GIBS layers that toggle on/off, Vegetation types, erosion hotspots; Pakistan + US only |
| Soil data | ✅ Live | USDA SSURGO live for US farms; Soil Survey of Pakistan / WAPDA province background |
| Theme, light/dark, Urdu typography | ✅ Live | `index.css` from our first (Base44) version kept |
| Sign in / register / forgot / reset | ✅ Live | Browser (local) accounts + demo farm; Google sign-in on Vercel when `VITE_GOOGLE_CLIENT_ID` is set |
| Farm setup after sign-in | ✅ Live | Pakistan or US; land, water, crops, rotation, goals; used by the planner and Kisan AI |
| Dashboard | ✅ Live | Greeting with globe, rotation summary, weather and air quality, fields, jobs, recommendations |
| Kisan AI chat | ✅ Live | Google Gemini, answers from the farm's NASA and survey data; agriculture-only; Urdu, Punjabi, English |
| Voice input & spoken replies | ✅ Live | Gemini speech-to-text; device voice by default, optional Gemini Urdu voice |
| Farm calendar | ✅ Live | Custom job types, notes, repeats; saved in the browser |
| Tools: fertilizer, seed rate, profit, schemes | ✅ Live | Rule-based; follow the Pakistan / US switch |
| Tools: irrigation planner, crop problem check | 🔜 Marked "Soon" | Shown at the bottom, switched off |
| Data sources, Privacy, Terms | ✅ Live | Data sources page shows what is live and what the app doesn't know |
| Knowledge base admin | ✅ Live | Admin-only nav item |
| Server database, server accounts | ⏳ Planned | Farm data is in the browser only |
| Mandi prices, SMS alerts | ❌ Removed | The profit calculator takes the farmer's own sale price |

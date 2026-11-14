# Architecture — Pakistan Kisan AI

```
Browser (Vite + React SPA)
 ├─ App.jsx ── routes (kept from our first Base44 version)
 │    ├─ public: Login, Register, ForgotPassword, ResetPassword, Mfa  (AuthLayout)
 │    └─ protected (ProtectedRoute → Layout): Dashboard, Assistant, Onboarding,
 │         Profile, Tools, Calendar, Settings, KnowledgeAdmin
 ├─ lib/AuthContext.jsx ── auth state (same interface as the Base44 version)
 ├─ hooks/useKisanData.js ── TanStack Query hooks per entity/service
 ├─ api/kisanClient.js ── entity-style data client  ◄── the only swap point
 └─ data/fixtures.js ── all stubbed data

Vercel (today): static hosting + SPA rewrite (vercel.json) + serverless functions in api/ (handlers in server/functions)

Next steps (see PLAN.md):
 ├─ Online accounts ── accounts, password reset, roles (admin for /knowledge)
 ├─ Vercel functions /api/* ── profile, fields, tasks, knowledge, weather
 ├─ A server database ── records
 ├─ File storage ── leaf photos, voice clips
 └─ Google Gemini ── chat assistant, knowledge-grounded answers, image diagnosis
```

## Data flow

Pages → `useX()` hooks → `kisan.entities.X.*` / `kisan.services.*` → fixtures + localStorage today, `fetch('/api/…')` later.
Pages never import fixtures for records. They only import static option lists (crops, provinces, languages).

## Entities (current shape)

- **FarmerProfile**: full_name, phone, language, province, district, village, land_acres, irrigation, soil_type, crops[]
- **Settings**: voice_replies, voice_language, weather_alerts, units
- **Field**: name, crop, variety, acres, sown, stage, health
- **Task**: title, field, date (YYYY-MM-DD, local), type, done
- **KnowledgeArticle**: title, category, crops[], language, status, updated, body

## Voice

The browser's Web Speech API handles both directions: `SpeechRecognition` turns speech into text (Urdu, Punjabi or English) and `speechSynthesis` reads replies aloud. Neither needs a server. Server-side speech is an optional later upgrade.

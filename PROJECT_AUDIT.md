# Project Audit — Pakistan Kisan AI

## What was received

Only part of the Base44 export arrived (the rest couldn't be uploaded):

| Received | Not received |
| --- | --- |
| `App.jsx` (complete route map), `main.jsx`, `index.css` (full theme) | All 13 page files under `src/pages/` |
| `AuthLayout.jsx`, `DashboardHeader.jsx` | `Layout`, `ProtectedRoute`, `ScrollToTop`, `UserNotRegisteredError` |
| `base44Client.js` | `src/lib/*` (`AuthContext`, `query-client`, `app-params`, `PageNotFound`, `utils`) |
| `package.json`, `package-lock.json`, Vite/Tailwind/PostCSS/ESLint/jsconfig/components.json | `src/components/ui/*` (shadcn components) |
| `index.html`, `.gitignore`, `.env` (one key), README/AGENTS/CLAUDE | `base44/` folder: entity schemas, backend functions, agent/chatbot config |

## Architecture found

- Vite + React 18 SPA, React Router 7, TanStack Query, Tailwind 3 with shadcn/ui ("new-york" style, lucide icons).
- A custom "Kisan" design system in `index.css`: a green/amber palette in light and dark modes (dark is the default, stored in the `kisan-theme` localStorage key), serif display type, Urdu Nastaliq class, and a `kisan-card` / `kisan-label` / `kisan-glow` vocabulary.
- Routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/mfa` (public); `/`, `/assistant`, `/onboarding`, `/profile`, `/tools`, `/calendar`, `/settings`, `/knowledge` (protected, inside `Layout`).
- The profile model, inferred from `DashboardHeader`, has `full_name`, `language` (`ur` / `pa` / `en`), `district` and `province`.

## Base44 dependencies identified

| Dependency | Where | Status |
| --- | --- | --- |
| `@base44/sdk` `createClient` | `src/api/base44Client.js` | **Removed** → `src/api/kisanClient.js` |
| `@base44/vite-plugin` (HMR/nav notifier, analytics, visual edit agent) | `vite.config.js` | **Removed** → plain Vite + `@` alias |
| `base44.auth` via `AuthContext` (public settings, `user_not_registered`, `auth_required`) | `App.jsx`, `lib/AuthContext` | **Replaced**; same context shape |
| `appParams` (app id, token, functions version) | `lib/app-params` | **Removed** (no longer needed) |
| `VITE_BASE44_APP_ID` | `.env` | **No longer read** |
| Base44 favicon URL | `index.html` | **Replaced** with a local `favicon.svg` |
| `base44 dev` / `base44 link` / dashboard publish workflow | README, AGENTS | **Replaced** with npm + Netlify |
| `base44/.app.jsonc` | `.gitignore` | **Removed** |
| Base44 entities, functions, integrations (LLM, file upload) | Not received | Rebuilt as stubs; real backend is in PLAN.md |

## Problems found

- `tailwind.config.js` uses `module.exports` in a `"type": "module"` package. Tailwind's loader tolerates this, so it was left as is.
- `index.html` referenced `/manifest.json`, but the file wasn't in the upload. It has been added.
- `@stripe/*` dependencies are present, but nothing that was received uses them. They were kept in case a missing page did.
- `nitro` beta devDependency is unused by the Vite config → removed.
- Security: `.env` held a Base44 app id. No secrets were in the received source.

# Migration Plan — Base44 → Independent (Netlify)

| Base44 piece | Replacement | Done? |
| --- | --- | --- |
| `@base44/vite-plugin` | Plain Vite + `@vitejs/plugin-react` + `@` alias | ✅ |
| `@base44/sdk` client | `src/api/kisanClient.js` (same entity-style API) | ✅ stubbed |
| `base44.auth` | `AuthContext` local session → Netlify Identity | ✅ stubbed · Milestone 3 |
| `base44.entities.*` | Netlify Database tables via Netlify Functions | Milestone 2 |
| `base44.functions.*` | Netlify Functions under `server/functions` | Milestone 2 |
| `base44.integrations.Core.InvokeLLM` | Netlify AI Gateway (no API keys to manage) | Milestone 4 |
| `base44.integrations.Core.UploadFile` | Netlify Blobs | Milestone 5 |
| Base44 hosting / publish | Netlify Git deploys | ✅ |

## Rules for each step

1. Change only the internals of `kisanClient.js` (and `AuthContext.jsx` for auth). Pages and hooks stay untouched.
2. Keep response shapes identical to the fixtures so no screen needs to change.
3. If the original Base44 page files turn up later, diff them against the rebuilt pages and bring back any behaviour that was lost.

The step-by-step roadmap is in **PLAN.md**.

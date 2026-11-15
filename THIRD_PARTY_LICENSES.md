# Third-party materials and licences

Kisan AI's own code is licensed under Apache 2.0 (see `LICENSE`). Everything below was made by others.
Each item is freely available or under an open-source licence approved by the Open Source Initiative (OSI).

## Data and services

| Source | Used for | Licence / terms |
|---|---|---|
| NASA POWER (power.larc.nasa.gov) | 20-year daily climate and the last 30 days at the farm | NASA open data, no restrictions |
| NASA GIBS (gibs.earthdata.nasa.gov): MODIS NDVI, land cover and land-surface temperature; SMAP L4 soil moisture; GPM IMERG rain; GRACE/GRACE-FO; Harmonized Landsat Sentinel-2; Blue Marble; reference borders and labels; colour tables and legends | Map layers and satellite readings at the farm | NASA open data, no restrictions |
| NASA SRTM 30 m elevation, through the OpenTopoData API (api.opentopodata.org) | Elevation, slope, erosion hotspots | SRTM: NASA/USGS public domain; OpenTopoData: free public API (software MIT) |
| Open-Meteo forecast, air quality and geocoding (open-meteo.com) | 7-day and hourly weather, air quality, US town search | CC BY 4.0 (credited on the Data sources page); geocoding uses GeoNames, CC BY 4.0 |
| USDA NRCS Soil Data Access (SSURGO) | Live soil survey for US farms | US Government work, public domain |
| Soil Survey of Pakistan, WAPDA, Pakistan Meteorological Department, Punjab Agriculture Department, PIDE published figures | Province soil background, crop calendar and scheme facts (typed in, cited in the app) | Published government and research figures, cited by source |
| Pakistan Bureau of Statistics 2023 census district list and provincial notifications | Pakistan district and tehsil list (`db/geo/pakistan.mjs`) | Published government data, cited in the file |
| Natural Earth 1:50m countries | Pakistan and US outlines (`src/data/coveredCountries.json`) | Public domain |
| Google Gemini API | Chat answers, speech-to-text, optional Urdu voice | Google Gemini API terms (a service, not shipped code); answers are labelled as AI-generated |
| Google Identity Services | Optional Google sign-in | Google APIs terms (a service, not shipped code) |

## Fonts (Google Fonts)

Montserrat, Public Sans, JetBrains Mono, Noto Naskh Arabic, Noto Nastaliq Urdu: SIL Open Font License 1.1.

## Code libraries (npm `dependencies` in `package.json`)

Totals: MIT 62, ISC 5, Apache-2.0 4, BSD-2-Clause 1. The map uses Leaflet (BSD-2-Clause) directly.
Build tools in `devDependencies` (Vite, Tailwind, ESLint and others) are MIT or similar and are not shipped in the app.

| Package | Version | Licence |
|---|---|---|
| @anthropic-ai/sdk | 1.6.0 | Apache-2.0 |
| @google/genai | 2.32.0 | Apache-2.0 |
| @hello-pangea/dnd | 17.0.0 | Apache-2.0 |
| @hookform/resolvers | 4.1.3 | MIT |
| @netlify/functions | 6.1.0 | MIT |
| @netlify/identity | 2.0.1 | MIT |
| @radix-ui/react-accordion | 1.3.1 | MIT |
| @radix-ui/react-alert-dialog | 1.2.1 | MIT |
| @radix-ui/react-aspect-ratio | 1.2.0 | MIT |
| @radix-ui/react-avatar | 1.3.1 | MIT |
| @radix-ui/react-checkbox | 1.4.1 | MIT |
| @radix-ui/react-collapsible | 1.2.1 | MIT |
| @radix-ui/react-context-menu | 2.4.1 | MIT |
| @radix-ui/react-dialog | 1.3.1 | MIT |
| @radix-ui/react-dropdown-menu | 2.2.1 | MIT |
| @radix-ui/react-hover-card | 1.2.1 | MIT |
| @radix-ui/react-label | 2.1.17 | MIT |
| @radix-ui/react-menubar | 1.2.1 | MIT |
| @radix-ui/react-navigation-menu | 1.4.1 | MIT |
| @radix-ui/react-popover | 1.3.1 | MIT |
| @radix-ui/react-progress | 1.2.1 | MIT |
| @radix-ui/react-radio-group | 1.5.1 | MIT |
| @radix-ui/react-scroll-area | 1.4.0 | MIT |
| @radix-ui/react-select | 2.4.1 | MIT |
| @radix-ui/react-separator | 1.2.0 | MIT |
| @radix-ui/react-slider | 1.6.1 | MIT |
| @radix-ui/react-slot | 1.5.0 | MIT |
| @radix-ui/react-switch | 1.4.1 | MIT |
| @radix-ui/react-tabs | 1.2.1 | MIT |
| @radix-ui/react-toast | 1.3.1 | MIT |
| @radix-ui/react-toggle | 1.2.1 | MIT |
| @radix-ui/react-toggle-group | 1.2.1 | MIT |
| @radix-ui/react-tooltip | 1.4.1 | MIT |
| @stripe/react-stripe-js | 3.11.0 | MIT |
| @stripe/stripe-js | 5.10.0 | MIT |
| @tanstack/react-query | 5.106.1 | MIT |
| canvas-confetti | 1.9.4 | ISC |
| class-variance-authority | 0.7.1 | Apache-2.0 |
| clsx | 2.1.1 | MIT |
| cmdk | 1.1.1 | MIT |
| d3-geo | 3.1.2 | ISC |
| date-fns | 3.6.0 | MIT |
| embla-carousel-react | 8.6.0 | MIT |
| fast-png | 6.4.0 | MIT |
| framer-motion | 11.18.2 | MIT |
| html2canvas | 1.4.1 | MIT |
| input-otp | 1.5.0 | MIT |
| jspdf | 4.2.1 | MIT |
| leaflet | 1.9.4 | BSD-2-Clause |
| lodash | 4.18.1 | MIT |
| lucide-react | 0.475.0 | ISC |
| moment | 2.31.0 | MIT |
| next-themes | 0.4.6 | MIT |
| react | 18.3.1 | MIT |
| react-day-picker | 8.10.2 | MIT |
| react-dom | 18.3.1 | MIT |
| react-hook-form | 7.91.0 | MIT |
| react-hot-toast | 2.6.1 | MIT |
| react-markdown | 9.1.0 | MIT |
| react-quill-new | 3.8.3 | MIT |
| react-resizable-panels | 2.1.9 | MIT |
| react-router-dom | 7.18.5 | MIT |
| recharts | 2.15.4 | MIT |
| remark-gfm | 4.0.1 | MIT |
| sonner | 2.0.8 | MIT |
| tailwind-merge | 3.7.0 | MIT |
| tailwindcss-animate | 1.0.7 | MIT |
| three | 0.171.0 | MIT |
| topojson-client | 3.1.0 | ISC |
| vaul | 1.1.2 | MIT |
| world-atlas | 2.0.2 | ISC |
| zod | 3.25.76 | MIT |

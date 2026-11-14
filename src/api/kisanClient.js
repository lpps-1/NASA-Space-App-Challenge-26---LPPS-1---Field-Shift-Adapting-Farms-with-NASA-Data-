import {
  DEMO_USER,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  FIELDS,
  KNOWLEDGE,
  TASKS,
  WEATHER,
} from "@/data/fixtures";
import { displayNameOf, mergeProfile, normalizeProfile } from "@/lib/profile";
import { airAt, hourlyAt, searchUS, usdaSoilAt, weatherAt } from "@/api/live";

/**
 * Independent data client — the replacement for `base44.entities`,
 * `base44.functions` and `base44.integrations`.
 *
 * It keeps an entity-style shape (`kisan.entities.Task.list()`) so the pages
 * read like they did before. Right now every call is served from
 * src/data/fixtures.js plus the browser's localStorage.
 *
 * The assistant and speech recognition already run on Vercel functions
 * (`/api/assistant`, `/api/transcribe`, code in server/functions) backed by Google Gemini.
 *
 * Later milestones (PLAN.md) replace the remaining bodies with
 * `fetch('/api/...')` calls backed by a server database. Page code should not
 * need to change.
 */

const PREFIX = "kisan-data:";
const LEGACY_OWNER = PREFIX + "legacy-owner";
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/**
 * Every record is stored per account: `kisan-data:<user_id>:<key>`, so two
 * farmers on one device never share a profile, name or history. The auth
 * provider calls `kisan.setActiveUser(id)` on sign-in and on page load.
 */
let activeUser = null;
let activeIdentity = null;
const scoped = (key) => `${PREFIX}${activeUser || "anon"}:${key}`;

/**
 * Data saved before per-account storage existed (`kisan-data:<key>`) belongs to
 * whoever was signed in. The first account that opens this device after the
 * upgrade adopts it, so nobody loses their farm, fields or conversations.
 */
function legacy(key) {
  try {
    const owner = localStorage.getItem(LEGACY_OWNER);
    if (owner && owner !== activeUser) return null;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    if (!owner && activeUser) localStorage.setItem(LEGACY_OWNER, activeUser);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function load(key, seed) {
  try {
    const raw = localStorage.getItem(scoped(key));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt storage */
  }
  const old = legacy(key);
  if (old != null) return save(key, old);
  return structuredClone(typeof seed === "function" ? seed() : seed);
}

function save(key, value) {
  localStorage.setItem(scoped(key), JSON.stringify(value));
  return value;
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  return data;
}

/**
 * Calls /api/geo, falling back to the bundled copy of the same dataset when the
 * API can't be reached (e.g. offline, or running Vite without the API).
 * A 404 from the API is a real "not found" and is not retried locally.
 */
async function geoCall(path, local) {
  try {
    return await getJson(`/api/geo${path}`);
  } catch (err) {
    if (err.status === 404 || err.status === 400) throw err;
    const g = await import("@/lib/geoLocal");
    const data = local(g);
    if (data == null) throw new Error("Not found");
    return data;
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** The demo farm is the only account that starts with sample fields and tasks. */
const isDemo = () => activeIdentity?.id === DEMO_USER.id;
const demoOnly = (rows) => () => (isDemo() ? rows : []);

function collection(key, seed) {
  return {
    async list() {
      await delay();
      return load(key, seed);
    },
    async create(data) {
      await delay();
      const rows = load(key, seed);
      const row = { id: uid(), ...data };
      save(key, [...rows, row]);
      return row;
    },
    async update(id, patch) {
      await delay();
      const rows = load(key, seed).map((r) => (r.id === id ? { ...r, ...patch } : r));
      save(key, rows);
      return rows.find((r) => r.id === id);
    },
    async delete(id) {
      await delay();
      save(key, load(key, seed).filter((r) => r.id !== id));
      return { id };
    },
  };
}

function singleton(key, seed) {
  return {
    async get() {
      await delay();
      return load(key, seed);
    },
    async update(patch) {
      await delay();
      return save(key, { ...load(key, seed), ...patch });
    },
  };
}

/** A brand-new account's profile: the demo farm's location and crops, but no name or phone. */
function seedProfile() {
  const { id, email, display_name } = activeIdentity || {};
  const demo = id === DEMO_USER.id;
  return normalizeProfile({
    ...DEFAULT_PROFILE,
    user_id: id || null,
    email: email || "",
    display_name: demo ? DEMO_USER.full_name : display_name || "",
    phone: demo ? DEFAULT_PROFILE.phone : "",
    // A new account starts with an empty farm; the farmer fills it in during farm setup.
    ...(demo
      ? {}
      : { village: "", land_acres: 0, irrigation: "", irrigation_methods: [], soil_type: "", crops: [], current_crops: [], previous_crops: [], rotation: "", goals: [], farm_setup_at: null, province: "", province_id: null, division: null, division_id: null, district: "", district_id: null, tehsil: null, lat: null, lng: null }),
  });
}

/**
 * The farmer profile. `display_name` is the farmer's own name and is only ever
 * changed by the farmer; `email` and `user_id` always come from the account.
 */
function profileEntity() {
  const read = () => {
    const p = normalizeProfile(load("profile", seedProfile));
    // Older records had no identity fields; attach them without touching the name.
    if (activeIdentity && (p.user_id !== activeIdentity.id || p.email !== activeIdentity.email)) {
      return save("profile", { ...p, user_id: activeIdentity.id, email: activeIdentity.email });
    }
    return p;
  };
  return {
    async get() {
      await delay();
      return read();
    },
    async update(patch) {
      await delay();
      return save("profile", mergeProfile(read(), patch || {}));
    },
  };
}

export const kisan = {
  /**
   * Points storage at one account. `identity` is { id, email, display_name? };
   * display_name is only used to seed a profile that doesn't exist yet.
   */
  setActiveUser(identity) {
    activeIdentity = identity || null;
    activeUser = identity?.id || null;
  },

  /** True on the demo farm, whose fields, tasks and dates are sample data. */
  isDemo,

  entities: {
    FarmerProfile: profileEntity(),
    Settings: singleton("settings", DEFAULT_SETTINGS),
    Field: collection("fields", demoOnly(FIELDS)),
    Task: collection("tasks", demoOnly(TASKS)),
    KnowledgeArticle: collection("knowledge", KNOWLEDGE),
    /** { id, title, updated, messages: [{ role, content }] }. Most recent first. */
    Conversation: collection("conversations", []),
    /** Plans saved from Kisan AI answers: { id, title, content, created, convoId }. Shown in the chat's right panel. */
    Plan: collection("plans", []),
  },

  services: {
    /**
     * Live 7-day forecast for the farmer's district (or tehsil) from /api/weather,
     * using coordinates from the district database. Falls back to sample data,
     * flagged with `sample: true`, if the service can't be reached.
     */
    async getWeather(profile) {
      const qs = new URLSearchParams();
      if (profile?.district_id) {
        qs.set("district", profile.district_id);
        if (profile.tehsil) qs.set("tehsil", profile.tehsil);
      } else if (Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng)) {
        qs.set("lat", profile.lat);
        qs.set("lng", profile.lng);
        qs.set("label", profile.district || "");
      }
      if ([...qs.keys()].length) {
        try {
          const live = await getJson(`/api/weather?${qs}`);
          // Without the API, the SPA fallback answers with HTML, not weather.
          if (live?.now && Array.isArray(live.forecast)) {
            // The air-quality call sometimes times out on the server; ask again from the browser.
            if (!live.air && Number.isFinite(profile?.lat)) live.air = await airAt(profile.lat, profile.lng);
            return live;
          }
        } catch {
          /* fall through to the direct forecast */
        }
      }
      if (Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng)) {
        try {
          return await weatherAt(profile.lat, profile.lng, [profile.tehsil, profile.district].filter(Boolean).join(", "));
        } catch {
          /* fall through to sample data */
        }
      }
      return {
        ...WEATHER,
        sample: true,
        location: profile?.district || WEATHER.location,
        advisory: "Live weather is unavailable right now, so this is sample data. Pick your district in your profile to get the local forecast.",
      };
    },

    /** Hour-by-hour forecast (temperature, rain chance, wind) for the farm, or [] when unavailable. */
    async getHourly(profile) {
      if (!Number.isFinite(profile?.lat) || !Number.isFinite(profile?.lng)) return [];
      try {
        return await hourlyAt(profile.lat, profile.lng);
      } catch {
        return [];
      }
    },

    /** Current air quality at the farm (US AQI, PM2.5, PM10), or null. */
    async getAir(profile) {
      if (!Number.isFinite(profile?.lat) || !Number.isFinite(profile?.lng)) return null;
      return airAt(profile.lat, profile.lng);
    },

    /** Towns and counties in the United States by name: [{ name, county, state, lat, lng }]. */
    async searchUS(q) {
      if (!q?.trim()) return [];
      return searchUS(q); // errors reach react-query, which retries instead of caching an empty list
    },

    /** The government soil survey at the farm. Live for US farms (USDA NRCS); null elsewhere. */
    async getSoilSurvey(profile) {
      if (profile?.country !== "US" || !Number.isFinite(profile?.lat) || !Number.isFinite(profile?.lng)) return null;
      try {
        return await usdaSoilAt(profile.lat, profile.lng);
      } catch {
        return null;
      }
    },

    /** NASA POWER agro-climate data for the last ~30 days at the farmer's district, or null when unavailable. */
    async getNasa(profile) {
      const qs = new URLSearchParams();
      if (profile?.district_id) qs.set("district", profile.district_id);
      else if (Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng)) {
        qs.set("lat", profile.lat);
        qs.set("lng", profile.lng);
      } else return null;
      try {
        const data = await getJson(`/api/nasa?${qs}`);
        return data?.period ? data : null;
      } catch {
        return null;
      }
    },

    /** 20 years of NASA POWER climate for the farmer's district (/api/climate), or null when unavailable. */
    async getClimate(profile) {
      const qs = new URLSearchParams();
      if (profile?.district_id) qs.set("district", profile.district_id);
      else if (Number.isFinite(profile?.lat) && Number.isFinite(profile?.lng)) {
        qs.set("lat", profile.lat);
        qs.set("lng", profile.lng);
      } else return null;
      try {
        const data = await getJson(`/api/climate?${qs}`);
        return data?.monthly ? data : null;
      } catch {
        return null;
      }
    },

    /** Elevation and slope at the farm from NASA SRTM (/api/terrain), or null when unavailable. */
    async getTerrain(profile) {
      if (!Number.isFinite(profile?.lat) || !Number.isFinite(profile?.lng)) return null;
      try {
        const data = await getJson(`/api/terrain?lat=${profile.lat}&lng=${profile.lng}`);
        return data?.elevation_m != null ? data : null;
      } catch {
        return null;
      }
    },

    /** Pakistan district list (/api/geo, bundled dataset; local fallback offline). */
    geo: {
      async provinces() {
        return (await geoCall("", (g) => g.listProvinces())).provinces;
      },
      /** { province, divisions, districts } */
      async province(id) {
        return geoCall(`/provinces/${id}`, (g) => g.getProvince(id));
      },
      /** District with its tehsils. */
      async district(id) {
        return (await geoCall(`/districts/${id}`, (g) => g.getDistrict(id))).district;
      },
      async search(q) {
        if (!q?.trim()) return [];
        return (await geoCall(`/search?q=${encodeURIComponent(q)}`, (g) => g.searchPlaces(q))).results;
      },
      async nearest(lat, lng) {
        return (await geoCall(`/nearest?lat=${lat}&lng=${lng}`, (g) => g.nearestDistrict(lat, lng))).district;
      },
    },
    /**
     * Streams a Kisan AI reply from /api/assistant (Google Gemini).
     * `messages` is the whole conversation so far, ending with the user's turn.
     * Calls onText(delta) as text arrives and onStatus("weather") while a tool runs.
     * Resolves to { role: "assistant", content, stop }.
     */
    async askAssistant({ messages, profile, fields, knowledge, voice = false, appLang, signal, onText, onStatus, onLanguage }) {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, profile, fields, knowledge, voice, app_lang: appLang }),
        signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Kisan AI is unavailable (HTTP ${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let content = "";
      let stop = null;
      let language = null;
      const handle = (line) => {
        if (!line.trim()) return;
        let ev;
        try {
          ev = JSON.parse(line);
        } catch {
          return;
        }
        if (ev.type === "text") {
          content += ev.value;
          onText?.(ev.value, content);
        } else if (ev.type === "status") onStatus?.(ev.value);
        else if (ev.type === "language") {
          language = ev.value;
          onLanguage?.(ev.value);
        } else if (ev.type === "done") stop = ev.stop;
        else if (ev.type === "error") throw Object.assign(new Error(ev.value), { partial: content });
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          handle(buf.slice(0, i));
          buf = buf.slice(i + 1);
        }
      }
      handle(buf);
      if (!stop && !content) throw new Error("The connection closed before Kisan AI answered. Please try again.");
      return { role: "assistant", content, stop: stop || "interrupted", language };
    },

    /**
     * Rewrites text so the device's speech voice can pronounce it as Pakistani Urdu
     * (/api/speech-text). target "hi": Urdu → Devanagari for a Hindi voice when the
     * device has no Urdu voice. target "ur": Roman Urdu → Urdu script.
     * Resolves to the converted string.
     */
    async speechText(text, target, { signal } = {}) {
      const res = await fetch("/api/speech-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target }),
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.text !== "string") throw new Error(data.error || `Speech text failed (HTTP ${res.status}).`);
      return data.text;
    },

    /**
     * Real Urdu speech from /api/tts (Gemini). Resolves to a WAV Blob.
     * Errors carry `status` (429 = daily limit reached) so the caller can fall back.
     */
    async speechAudio(text, { signal } = {}) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "ur" }),
        signal: signal || AbortSignal.timeout(15000),
      });
      if (!res.ok || !(res.headers.get("content-type") || "").includes("audio")) {
        const data = await res.json().catch(() => ({}));
        throw Object.assign(new Error(data.detail || data.error || `Speech failed (HTTP ${res.status}).`), { status: res.status, reason: data.error });
      }
      return res.blob();
    },

    /** Sends recorded audio to /api/transcribe. Resolves to { text, language }. */
    async transcribe(blob, lang, { signal } = {}) {
      const res = await fetch(`/api/transcribe?lang=${encodeURIComponent(lang || "")}`, {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/wav" },
        body: blob,
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Speech recognition failed (HTTP ${res.status}).`);
      return data;
    },
  },

  /**
   * Resets this account's demo data (fields, tasks, conversations, settings,
   * farm details). The farmer's name, email and account id are kept.
   */
  reset() {
    let keep = null;
    try {
      keep = JSON.parse(localStorage.getItem(scoped("profile")) || "null");
    } catch {
      /* ignore */
    }
    const mine = `${PREFIX}${activeUser || "anon"}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(mine))
      .forEach((k) => localStorage.removeItem(k));
    if (keep) save("profile", { ...seedProfile(), display_name: displayNameOf(keep) });
  },
};

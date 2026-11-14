import { gemini } from "../lib/gemini.mjs";

/**
 * POST /api/tts
 * Body: { text: string, lang?: "ur" }
 * Response: audio/wav (16 kHz, 16-bit, mono)
 *
 * Real Pakistani Urdu speech from Gemini's speech models (Urdu, ur-PK, is
 * supported in preview). The browser uses this when the device has no Urdu
 * voice, instead of reading a Devanagari spelling with a Hindi voice, which
 * sounds like Hindi. If this fails (quota, timeout), the browser falls back to
 * its own voices, so speech never stops.
 *
 * Environment (optional):
 *   KISAN_TTS_MODEL  speech model id to try first
 *   KISAN_TTS_VOICE  Gemini voice name (default "Kore")
 *   KISAN_TTS        "off" to disable and always use the device's voices
 * Key: GEMINI_API_KEY (server/lib/gemini.mjs).
 */

// Current Gemini speech models first (3.8 launched Sept 2026). The 2.5 TTS models are now limited
// to keys that used them before, so they are only a last resort.
const MODELS = [
  process.env.KISAN_TTS_MODEL,
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
].filter(Boolean);
const VOICE = process.env.KISAN_TTS_VOICE || "Charon"; // male: Kisan AI speaks of itself in the masculine in Urdu
const MAX_CHARS = 1500; // one request per answer part saves the daily speech quota
const CACHE = new Map(); // text → wav, so "Listen" again costs nothing
const CACHE_MAX = 60;
const OUT_RATE = 16000; // small enough for slow village connections, clear enough for speech
let workingModel = null; // the first model that answered, reused on warm starts
// Free-tier keys get only ~10 speech requests a day per model, so a model that hits its daily
// limit is skipped until the time Google gives, and the next speech model is tried instead.
const restingUntil = new Map();

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

/** Little-endian 16-bit PCM → Int16Array (copying so odd byte offsets are safe). */
function pcm16(buf) {
  const out = new Int16Array(Math.floor(buf.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2);
  return out;
}

/** Linear-interpolation resample (speech only, so this is plenty). */
export function resample(samples, from, to) {
  if (from === to) return samples;
  const n = Math.max(1, Math.round((samples.length * to) / from));
  const out = new Int16Array(n);
  const step = from / to;
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const i0 = Math.floor(x);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const f = x - i0;
    out[i] = Math.round(samples[i0] * (1 - f) + samples[i1] * f);
  }
  return out;
}

export function wav(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(samples[i], i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const CUES = [(t) => `TTS the following text, word for word: "${t}"`, (t) => `Read aloud: "${t}"`];
const CHECK_MODEL = process.env.KISAN_TTS_CHECK_MODEL || "gemini-3-flash-preview"; // same model as /api/transcribe

/** Letters and digits only, so punctuation and spacing don't count as differences. */
const words = (t) =>
  String(t)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * True when the audio says the text and nothing else: a speech-to-text pass must find most of the
 * words, in about the same amount. Catches the model reading the instruction aloud or making up
 * its own sentence. If the check itself fails (quota, timeout), the clip is NOT played: the browser
 * then uses the device's own voice, which is better than speaking the wrong words.
 */
async function saysText(samples, rate, text) {
  try {
    const audio = wav(resample(samples, rate, OUT_RATE), OUT_RATE).toString("base64");
    const res = await gemini().models.generateContent({
      model: CHECK_MODEL,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/wav", data: audio } }, { text: "Transcribe this speech exactly, in the script it is spoken in. Output only the words." }] }],
      config: { abortSignal: AbortSignal.timeout(20000) },
    });
    const heard = words(res.text || "");
    const want = words(text);
    if (!want.length) return true;
    const pool = new Map();
    for (const w of heard) pool.set(w, (pool.get(w) || 0) + 1);
    let hit = 0;
    for (const w of want) if (pool.get(w) > 0) { hit++; pool.set(w, pool.get(w) - 1); }
    const recall = hit / want.length;
    const extra = heard.length / want.length;
    return recall >= 0.6 && extra <= 1.35;
  } catch (err) {
    console.error("tts check failed", err?.status, String(err?.message || "").slice(0, 120));
    return false;
  }
}

async function synthesize(model, text, { withLanguage, cue = 0 }) {
  const res = await gemini().models.generateContent({
    model,
    // A short cue with the text in quotes. A long style line ("Say this in a warm, clear … voice") was
    // read out loud; with no cue the model made up its own sentence; "Say in Urdu:" made it talk *to* Urdu.
    contents: [{ role: "user", parts: [{ text: CUES[cue](text) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
        ...(withLanguage ? { languageCode: "ur-PK" } : {}),
      },
      abortSignal: AbortSignal.timeout(20000),
    },
  });
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw Object.assign(new Error("No audio in the response"), { status: 502 });
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) || 24000;
  return { samples: pcm16(Buffer.from(part.inlineData.data, "base64")), rate };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed. Use POST." });
  if ((process.env.KISAN_TTS || "").toLowerCase() === "off") return json(503, { error: "disabled" });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json(400, { error: "`text` is required." });
  if (text.length > MAX_CHARS) return json(413, { error: `Text is too long (max ${MAX_CHARS} characters).` });

  const cached = CACHE.get(text);
  if (cached) return new Response(cached, { status: 200, headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Kisan-TTS-Cache": "hit" } });

  const order = (workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS).filter((m) => !(restingUntil.get(m) > Date.now()));
  if (!order.length) return json(429, { error: "quota", detail: "Daily speech limit reached on every speech model." });
  let lastErr = null;
  for (const model of order) {
    for (const withLanguage of [true, false]) {
      try {
        let clip = await synthesize(model, text, { withLanguage, cue: 0 });
        if (!(await saysText(clip.samples, clip.rate, text))) {
          console.error("tts mismatch, retrying with another wording", model);
          clip = await synthesize(model, text, { withLanguage, cue: 1 });
          if (!(await saysText(clip.samples, clip.rate, text))) throw Object.assign(new Error("Speech did not match the text"), { status: 422 });
        }
        const { samples, rate } = clip;
        workingModel = model;
        const audio = wav(resample(samples, rate, OUT_RATE), OUT_RATE);
        CACHE.set(text, audio);
        if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
        return new Response(audio, {
          status: 200,
          headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Kisan-TTS-Model": model },
        });
      } catch (err) {
        lastErr = err;
        const status = err?.status;
        console.error("tts error", model, withLanguage ? "+lang" : "", status, err?.message);
        // Daily limit on this model: rest it and try the next speech model.
        if (status === 429) {
          const wait = Number(/retry in (?:(\d+)h)?(?:(\d+)m)?/.exec(String(err?.message))?.slice(1).reduce((a, v, i) => a + (Number(v) || 0) * (i ? 60 : 3600), 0)) || 3600;
          restingUntil.set(model, Date.now() + wait * 1000);
          if (workingModel === model) workingModel = null;
          break;
        }
        // A bad key or a timeout: trying other models won't help.
        if (status === 401 || err?.name === "TimeoutError" || err?.name === "AbortError") {
          const code = status === 401 ? "key" : "timeout";
          return json(status === 401 ? 401 : 504, { error: code, detail: String(err?.message || "").slice(0, 200) });
        }
        // 400 with the language field → retry once without it; 404 → next model.
        if (!(status === 400 && withLanguage)) break;
      }
    }
  }
  if (lastErr?.status === 429) return json(429, { error: "quota", detail: "Daily speech limit reached on every speech model." });
  return json(502, { error: "no-model", detail: String(lastErr?.message || "No speech model answered.").slice(0, 200) });
};


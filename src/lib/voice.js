/**
 * Browser voice layer for Kisan AI.
 *
 *  - Recording: getUserMedia + MediaRecorder, with an AnalyserNode for the
 *    level meter and silence detection (auto-stop when the farmer stops
 *    talking; patient or manual end-of-turn, and barge-in while the AI speaks).
 *    The recording is converted to 16 kHz mono WAV (in parts of under a
 *    minute for long voice notes) before upload so
 *    every browser (Chrome/Android WebM, Safari/iOS MP4) sends the same format.
 *    Speech recognition happens server-side (/api/transcribe), so it does not
 *    depend on the browser's own SpeechRecognition (missing in Firefox and
 *    unreliable for Urdu).
 *  - Speaking: the Web Speech synthesis API, with a voice picked per sentence
 *    by script (Urdu/Shahmukhi → Urdu voice, Latin → English voice). Text is
 *    spoken sentence-by-sentence so playback can start while the reply streams.
 */

import { detectLanguage } from "./language.js";
import { hasArabicScript, urduToDevanagari } from "./urduTranslit.js";

let sharedCtx = null;
function audioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctx();
  if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

/* ------------------------------------------------------------------ */
/* Support checks and errors                                           */
/* ------------------------------------------------------------------ */

export function micSupport() {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!window.isSecureContext) return { ok: false, reason: "insecure" };
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: "unsupported" };
  if (typeof window.MediaRecorder === "undefined") return { ok: false, reason: "unsupported" };
  return { ok: true };
}

export function micErrorMessage(err) {
  const name = err?.name || err?.reason || err;
  switch (name) {
    case "insecure":
      return "The microphone only works over a secure (https://) connection.";
    case "unsupported":
      return "This browser can't record audio. Please use a recent Chrome, Edge, Firefox or Safari.";
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "Microphone permission was blocked. Tap the lock icon next to the address bar, allow the microphone, then try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "The microphone is being used by another app. Close it and try again.";
    case "AbortError":
      return "The recording was interrupted. Please try again.";
    default:
      return err?.message || "Could not start the microphone.";
  }
}

const RECORDER_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/aac"];

/* ------------------------------------------------------------------ */
/* Recorder                                                            */
/* ------------------------------------------------------------------ */

/**
 * Starts recording. Resolves once the microphone is live.
 * Options:
 *  - onLevel(0..1): mic level for the meter
 *  - onSilence(): fired when speech has been followed by `endSilenceMs` of
 *    silence (end of the farmer's turn). `endSilenceMs: 0` turns auto-stop off,
 *    so the recording runs until stop() is called (a long voice note).
 *  - onNoSpeech(): fired if nothing is heard for `noSpeechMs` (0 = never)
 *  - onSpeechStart(): fired once, when the farmer starts talking
 *  - bargeIn: start "armed" while Kisan AI is speaking. The speaker's own
 *    voice leaks into the mic, so the threshold is calibrated on that echo and
 *    only clearly louder, sustained speech counts. Until then neither
 *    onSilence nor onNoSpeech fire. stop() trims the audio to start just before
 *    the farmer's speech, so the AI's echo is not transcribed.
 *  - maxMs: hard stop (default 5 minutes; long recordings are transcribed in parts)
 * Returns { stop(): Promise<{ blob, durationMs, heardSpeech, speechStartMs }>, cancel() }
 */
export async function startRecording({
  onLevel,
  onSilence,
  onNoSpeech,
  onSpeechStart,
  bargeIn = false,
  endSilenceMs = 1800,
  maxMs = 5 * 60 * 1000,
  noSpeechMs = 9000,
} = {}) {
  const support = micSupport();
  if (!support.ok) throw Object.assign(new Error(micErrorMessage(support.reason)), { name: support.reason });

  const ctx = audioContext(); // create/resume inside the user gesture (needed on iOS)
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });

  const mimeType = RECORDER_TYPES.find((t) => window.MediaRecorder.isTypeSupported?.(t));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);

  // Level meter + voice activity detection
  let raf = 0;
  let heardSpeech = false;
  let speechStartMs = 0;
  let lastVoice = performance.now();
  const startedAt = performance.now();
  let noiseFloor = 0.01;
  let armed = bargeIn;
  let echoFloor = 0.02;
  let voicedRun = 0; // ms of recent loud frames while armed
  let lastTick = startedAt;
  let source = null;
  if (ctx) {
    try {
      source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let fired = false;
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        const dt = Math.min(100, now - lastTick);
        lastTick = now;
        const elapsed = now - startedAt;
        onLevel?.(Math.min(1, rms / 0.15));

        if (armed) {
          // Learn how loud the AI's own voice is in the mic, then wait for clearly louder speech.
          if (elapsed < 700) echoFloor = Math.max(echoFloor, echoFloor * 0.85 + rms * 0.15, rms * 0.8);
          else {
            const threshold = Math.max(0.045, echoFloor * 2.4);
            voicedRun = rms > threshold ? voicedRun + dt : Math.max(0, voicedRun - dt * 0.5);
            if (voicedRun > 320) {
              armed = false;
              heardSpeech = true;
              speechStartMs = Math.max(0, elapsed - voicedRun - 250);
              lastVoice = now;
              noiseFloor = 0.01;
              onSpeechStart?.();
            }
          }
          raf = requestAnimationFrame(tick);
          return;
        }

        if (elapsed < 350 && !bargeIn) noiseFloor = Math.max(noiseFloor * 0.8 + rms * 0.2, 0.004);
        const threshold = Math.max(0.018, noiseFloor * 2.5);
        if (rms > threshold) {
          if (elapsed > 150) {
            if (!heardSpeech) {
              heardSpeech = true;
              speechStartMs = Math.max(0, elapsed - 300);
              onSpeechStart?.();
            }
          }
          lastVoice = now;
        }
        if (!fired) {
          if (endSilenceMs > 0 && heardSpeech && now - lastVoice > endSilenceMs) {
            fired = true;
            onSilence?.();
          } else if (noSpeechMs > 0 && !heardSpeech && elapsed > noSpeechMs) {
            fired = true;
            onNoSpeech?.();
          } else if (elapsed > maxMs) {
            fired = true;
            onSilence?.();
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      /* metering is optional */
    }
  }

  const cleanup = () => {
    cancelAnimationFrame(raf);
    try {
      source?.disconnect();
    } catch {
      /* ignore */
    }
    stream.getTracks().forEach((t) => t.stop());
    onLevel?.(0);
  };

  recorder.start(250);

  return {
    mimeType: recorder.mimeType || mimeType || "audio/webm",
    get armed() {
      return armed;
    },
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          cleanup();
          const blob = new Blob(chunks, { type: (recorder.mimeType || mimeType || "audio/webm").split(";")[0] });
          // Without a meter we can't know, so assume speech and let the server decide
          resolve({
            blob,
            durationMs: performance.now() - startedAt,
            heardSpeech: ctx ? heardSpeech : true,
            speechStartMs: bargeIn ? speechStartMs : 0,
          });
        };
        if (recorder.state !== "inactive") recorder.stop();
        else recorder.onstop();
      });
    },
    cancel() {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
  };
}

/* ------------------------------------------------------------------ */
/* WAV conversion                                                      */
/* ------------------------------------------------------------------ */

async function decodeMono(blob, targetRate) {
  const ctx = audioContext();
  if (!ctx) return null;
  const decoded = await new Promise((res, rej) => {
    blob.arrayBuffer().then((ab) => {
      const p = ctx.decodeAudioData(ab, res, rej);
      if (p?.then) p.then(res, rej);
    }, rej);
  });
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const off = new OAC(1, length, targetRate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

/** Decodes any recorded blob and re-encodes it as 16 kHz mono 16-bit WAV. Falls back to the original blob. */
export async function toWav(blob, targetRate = 16000) {
  try {
    const samples = await decodeMono(blob, targetRate);
    return samples ? encodeWav(samples, targetRate) : blob;
  } catch {
    return blob;
  }
}

/**
 * Index of the quietest 100 ms inside samples[from, to), so a long recording is
 * cut between words rather than in the middle of one.
 */
export function quietestPoint(samples, from, to, rate = 16000) {
  const win = Math.max(1, Math.round(rate / 10));
  let best = to;
  let bestEnergy = Infinity;
  for (let start = Math.max(0, from); start + win <= to; start += Math.round(win / 2)) {
    let e = 0;
    for (let i = start; i < start + win; i++) e += samples[i] * samples[i];
    if (e < bestEnergy) {
      bestEnergy = e;
      best = start + Math.round(win / 2);
    }
  }
  return best;
}

/** Splits samples into parts of at most `chunkSec`, cutting at pauses. Returns [start, end) pairs. */
export function chunkBounds(length, samples, { rate = 16000, chunkSec = 55, searchSec = 8 } = {}) {
  const max = Math.round(chunkSec * rate);
  const bounds = [];
  let start = 0;
  while (length - start > max) {
    const end = samples ? quietestPoint(samples, start + max - Math.round(searchSec * rate), start + max, rate) : start + max;
    bounds.push([start, end]);
    start = end;
  }
  bounds.push([start, length]);
  return bounds;
}

/**
 * Converts a recording to one or more 16 kHz mono WAV files of at most about
 * a minute each, so a voice note of any length (up to the recorder's limit)
 * can be transcribed in full. `trimStartMs` drops audio before the farmer
 * started speaking (barge-in). Falls back to [original blob].
 */
export async function toWavParts(blob, { trimStartMs = 0, chunkSec = 55, targetRate = 16000 } = {}) {
  try {
    let samples = await decodeMono(blob, targetRate);
    if (!samples) return [blob];
    const skip = Math.min(samples.length - 1, Math.round((trimStartMs / 1000) * targetRate));
    if (skip > 0) samples = samples.subarray(skip);
    return chunkBounds(samples.length, samples, { rate: targetRate, chunkSec })
      .filter(([a, b]) => b - a > targetRate * 0.3)
      .map(([a, b]) => encodeWav(samples.subarray(a, b), targetRate));
  } catch {
    return [blob];
  }
}

function encodeWav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  const gain = peak > 0 && peak < 0.5 ? 0.9 / peak : 1; // normalise quiet recordings
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/* ------------------------------------------------------------------ */
/* Text-to-speech                                                      */
/* ------------------------------------------------------------------ */

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const GURMUKHI = /[਀-੿]/;

export const ttsSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";

let voicesCache = [];
function voices() {
  if (!ttsSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
const voiceListeners = new Set();
if (ttsSupported()) {
  voices();
  const onChange = () => {
    voices();
    voiceListeners.forEach((fn) => fn());
  };
  if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener("voiceschanged", onChange);
  else window.speechSynthesis.onvoiceschanged = onChange;
}
/** Calls fn when the browser's voice list changes. Returns an unsubscribe function. */
export function onVoicesChanged(fn) {
  voiceListeners.add(fn);
  return () => voiceListeners.delete(fn);
}

/**
 * Resolves once the browser has listed its voices. Chrome loads them
 * asynchronously, so a reply that arrives first would otherwise be planned
 * with an empty list and handed to the default (English) voice.
 */
export function voicesReady(timeoutMs = 2000) {
  if (!ttsSupported() || voices().length) return Promise.resolve(voicesCache);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      off();
      clearInterval(poll);
      resolve(voices());
    };
    const off = onVoicesChanged(() => voices().length && finish());
    // Safari never fires voiceschanged on some versions: poll as well.
    const poll = setInterval(() => voices().length && finish(), 150);
    setTimeout(finish, timeoutMs);
  });
}

/** Returns "ur" | "ur-Latn" | "pa" | "pa-Guru" | "en" for a piece of text, by script and wording. */
export function scriptLang(text) {
  if (GURMUKHI.test(text)) return "pa-Guru";
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!letters) return "en";
  const arabic = [...letters].filter((c) => ARABIC.test(c)).length;
  if (arabic / letters.length > 0.3) return detectLanguage(text).code === "pa" ? "pa" : "ur";
  const d = detectLanguage(text);
  return (d.code === "ur-Latn" || d.code === "pa-Latn") && d.confidence >= 0.5 ? "ur-Latn" : "en";
}

const langOf = (v) => v.lang.replace("_", "-").toLowerCase();

function score(v, prefs) {
  const lang = langOf(v);
  let s = -1;
  prefs.forEach((p, i) => {
    if (s < 0 && lang.startsWith(p)) s = 100 - i * 10;
  });
  if (s < 0) return -1;
  if (/natural|neural|online|premium|enhanced|wavenet/i.test(v.name)) s += 6;
  // Kisan AI talks about itself in the masculine in Urdu ("میں مدد کر سکتا ہوں"), so a male voice
  // matches; a female voice saying masculine verbs sounds wrong.
  if (MALE.test(v.name)) s += 8;
  if (/google|microsoft/i.test(v.name)) s += 3;
  if (!v.localService) s += 1;
  return s;
}

const MALE = /(asad|salman|madhur|hemant|prabhat|ravi|kunal|aarav|arjun|rehaan|david|mark|guy|ryan|george|andrew|brian|christopher|eric|roger|thomas|liam|william|james|daniel|male)/i;

const PREFS = {
  ur: ["ur-pk", "ur-in", "ur"],
  // Only Shahmukhi Punjabi voices can read Punjabi in Urdu script. pa-IN voices read Gurmukhi.
  "pa-Arab": ["pa-pk", "pa-arab"],
  "pa-Guru": ["pa-in", "pa-guru", "pa"],
  hi: ["hi-in", "hi"],
  en: ["en-pk", "en-in", "en-gb", "en-us", "en"],
};
const BCP = { ur: "ur-PK", "pa-Guru": "pa-IN", hi: "hi-IN", en: "en-US" };

export function pickVoice(lang) {
  const prefs = PREFS[lang] || PREFS.en;
  let best = null;
  let bestScore = -1;
  for (const v of voices()) {
    const s = score(v, prefs);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return bestScore >= 0 ? best : null;
}

export function hasVoiceFor(lang) {
  return !!pickVoice(lang);
}

const isUrduReader = (v) => /^(ur|pa-pk|pa-arab)/.test(langOf(v));

/** Voices that can read Urdu replies: Urdu and Shahmukhi Punjabi voices, and Hindi voices (via Devanagari). */
export function urduCapableVoices() {
  const prefs = [...PREFS.ur, ...PREFS["pa-Arab"], ...PREFS.hi];
  return voices()
    .filter((v) => isUrduReader(v) || langOf(v).startsWith("hi"))
    .sort((a, b) => score(b, prefs) - score(a, prefs));
}

/**
 * How Urdu will be spoken on this device:
 *  { mode: "native", voice }  an Urdu (or Shahmukhi Punjabi) voice reads Urdu script
 *  { mode: "hindi", voice }   a Hindi voice reads a Devanagari spelling of the Urdu words
 *  { mode: "none", voice: null }  no voice can pronounce Urdu; never fall back to English
 * `preferredURI` is the voice chosen in Settings (optional).
 */
export function urduVoicePlan(preferredURI) {
  const chosen = preferredURI ? voices().find((v) => v.voiceURI === preferredURI) : null;
  if (chosen) {
    if (isUrduReader(chosen)) return { mode: "native", voice: chosen };
    if (langOf(chosen).startsWith("hi")) return { mode: "hindi", voice: chosen };
  }
  const ur = pickVoice("ur") || pickVoice("pa-Arab");
  if (ur) return { mode: "native", voice: ur };
  const hi = pickVoice("hi");
  if (hi) return { mode: "hindi", voice: hi };
  return { mode: "none", voice: null };
}

/** A summary of what this device can say, for status labels in the UI. */
export function speechCapabilities(preferredURI) {
  if (!ttsSupported()) return { supported: false, urdu: { mode: "none", voice: null }, english: null };
  return { supported: true, urdu: urduVoicePlan(preferredURI), english: pickVoice("en") };
}

// Markdown table divider lines (e.g. |---|:--|). Built from a string so Tailwind's
// class scanner doesn't read the character class as an arbitrary CSS property.
const TABLE_RULE = new RegExp("^\\s*[" + "|:" + "\\-]+\\s*$");

/** Strips Markdown, tables, links and emoji so TTS reads only the words. */
export function speakableText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((l) => !/^\s*\|/.test(l) && !TABLE_RULE.test(l))
    .join("\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#>`~]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*[۰-۹]+[.)۔]\s+/gm, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s*\n+\s*/g, "\n")
    .trim();
}

// Abbreviations farmers hear spelled out in Urdu.
const URDU_ABBR = [
  [/\bDAP\b/g, "ڈی اے پی"],
  [/\bSOP\b/g, "ایس او پی"],
  [/\bMOP\b/g, "ایم او پی"],
  [/\bNPK\b/g, "این پی کے"],
  [/\bSSP\b/g, "ایس ایس پی"],
  [/\bTSP\b/g, "ٹی ایس پی"],
  [/\bCAN\b/g, "کین"],
  [/\bIPM\b/g, "آئی پی ایم"],
  [/\bpH\b/g, "پی ایچ"],
  [/\bEC\b/g, "ای سی"],
  [/\bPMD\b/g, "محکمہ موسمیات"],
  [/\bCLCuV\b/g, "پتہ مروڑ وائرس"],
  [/\bAI\b/g, "اے آئی"],
  [/\burea\b/gi, "یوریا"],
  [/\bspray\b/gi, "سپرے"],
  [/\bacres?\b/gi, "ایکڑ"],
];

/** Rewrites symbols, ranges and units so an Urdu voice reads them like a Pakistani speaker. */
export function urduSpeech(text) {
  let t = text;
  for (const [re, word] of URDU_ABBR) t = t.replace(re, word);
  return t
    .replace(/(\d)\s*[-–—]\s*(\d)/g, "$1 سے $2")
    .replace(/(\d)\s*%/g, "$1 فیصد")
    .replace(/(\d)\s*°(\s*C(?![A-Za-z]))?/g, "$1 ڈگری")
    .replace(/(\d)\s*(kg|کلوگرام)\b/gi, "$1 کلو")
    .replace(/(\d)\s*(ml)\b/gi, "$1 ملی لیٹر")
    .replace(/(\d)\s*(mm)\b/gi, "$1 ملی میٹر")
    .replace(/(\d)\s*(km)\b/gi, "$1 کلومیٹر")
    .replace(/(\d)\s*(L|ltr|litres?|liters?)\b/gi, "$1 لیٹر")
    .replace(/\s*\/\s*(ایکڑ|ہیکٹر|کنال|من|بوری|لیٹر|کلو)/g, " فی $1")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1 ضرب $2")
    .replace(/(\d)\s*÷\s*(\d)/g, "$1 تقسیم $2")
    .replace(/(\d)\s*\+\s*(\d)/g, "$1 جمع $2")
    .replace(/\s*=\s*/g, " برابر ")
    .replace(/\s*[→⇒]\s*/g, "، پھر ")
    .replace(/([^\d\s])\s*\/\s*([^\d\s])/g, "$1 یا $2")
    .replace(/[()[\]{}]/g, "، ")
    .replace(/\s+،/g, "،")
    .replace(/(،\s*){2,}/g, "، ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Same idea for English sentences. */
export function englishSpeech(text) {
  return text
    .replace(/(\d)\s*[-–—]\s*(\d)/g, "$1 to $2")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/(\d)\s*°\s*C\b/g, "$1 degrees Celsius")
    .replace(/(\d)\s*kg\b/gi, "$1 kilograms")
    .replace(/(\d)\s*ml\b/gi, "$1 millilitres")
    .replace(/(\d)\s*mm\b/gi, "$1 millimetres")
    .replace(/\s*\/\s*acre\b/gi, " per acre")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1 times $2")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s*[→⇒]\s*/g, ", then ")
    .replace(/[()[\]{}]/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const SENTENCE_END = /([.!?؟۔]+["')\]]?\s+|\n+)/;

/** Splits off complete sentences from a growing buffer. Returns [sentences, rest]. */
export function takeSentences(buffer) {
  const out = [];
  let rest = buffer;
  let m;
  while ((m = SENTENCE_END.exec(rest))) {
    const end = m.index + m[0].length;
    const s = rest.slice(0, end).trim();
    if (s) out.push(s);
    rest = rest.slice(end);
  }
  return [out, rest];
}

const prepCache = new Map();
function cachedPrepare(prepare, text, target) {
  const key = target + "\u0000" + text;
  if (prepCache.has(key)) return prepCache.get(key);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), 8000);
  });
  const p = Promise.race([prepare(text, target), timeout])
    .finally(() => clearTimeout(timer))
    .catch((err) => {
      prepCache.delete(key);
      throw err;
    });
  prepCache.set(key, p);
  if (prepCache.size > 300) prepCache.delete(prepCache.keys().next().value);
  return p;
}

const URDU_FAMILY = new Set(["ur", "ur-Latn", "pa", "pa-Latn", "sd", "ps", "hi"]);

// ---- Cloud Urdu voice (Gemini via /api/tts) ----
// Used when the device has no Urdu voice, so Urdu is heard in a Pakistani Urdu
// voice instead of a Hindi voice. Falls back to the device's voices on any error.
const CLOUD_LANGS = new Set(["ur", "ur-Latn", "pa"]);
let cloudOffUntil = 0; // set after quota errors or repeated failures
let cloudFailures = 0;
let sharedAudio = null;
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
function audioEl() {
  if (!sharedAudio && typeof Audio !== "undefined") sharedAudio = new Audio();
  return sharedAudio;
}

/** True when an Urdu-family reply should use the cloud voice on this device. */
function wantsCloud(lang, opts, synthesize) {
  if (!synthesize || !CLOUD_LANGS.has(lang)) return false;
  if (!opts.cloudVoice) return false; // the online Gemini voice is opt-in (Settings → Voice assistant)
  if (opts.voiceURI) return false; // a voice chosen in Settings always wins
  return urduVoicePlan().mode !== "native";
}

function noteCloudFailure(err) {
  cloudFailures++;
  if (err?.status === 429) cloudOffUntil = Date.now() + 60 * 60 * 1000; // daily limit: rest an hour
  else if (err?.status === 503 || cloudFailures >= 3) cloudOffUntil = Date.now() + 10 * 60 * 1000;
}

let lastCloudReason = null;

/**
 * Plans one cloud chunk: audio URL on success. Urdu is never handed to a Hindi
 * voice: after one retry a failure gives { mode: "skip", reason } and the
 * answer stays as text (the page tells the farmer why).
 */
async function planCloud(text, hint, opts, prepare, synthesize) {
  if (Date.now() < cloudOffUntil) return devicePlan(text, hint, opts, prepare, lastCloudReason || "unavailable");
  let src = text;
  if (hint === "ur-Latn" && prepare && !hasArabicScript(text)) {
    src = await cachedPrepare(prepare, text, "ur").catch(() => text);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const blob = await synthesize(urduSpeech(src));
      cloudFailures = 0;
      return { mode: "cloud", url: URL.createObjectURL(blob), text, rate: opts.rate || 1 };
    } catch (err) {
      lastCloudReason = err?.reason || (err?.status === 429 ? "quota" : err?.status === 401 ? "key" : "unavailable");
      if (err?.status === 429 || err?.status === 401) break; // retrying won't help
      if (attempt === 0) await sleep(600);
      else noteCloudFailure(err);
    }
  }
  if (lastCloudReason === "quota" || lastCloudReason === "key") noteCloudFailure({ status: lastCloudReason === "quota" ? 429 : 503 });
  return devicePlan(text, hint, opts, prepare, lastCloudReason);
}

/** The cloud voice is unavailable: plan the text for the device's voices, in short pieces. */
async function devicePlan(text, hint, opts, prepare, reason) {
  const parts = joinShort(text
    .split("\n")
    .flatMap((line) => {
      const [sentences, rest] = takeSentences(line + " ");
      return rest.trim() ? [...sentences, rest.trim()] : sentences;
    })
    .flatMap(split));
  const pieces = await Promise.all(parts.map((t) => planPiece(t, hint, { ...opts, noCloud: true }, prepare)));
  // Nothing on this device can say it: keep the answer as text and tell the page why.
  if (!pieces.some((x) => x.text?.trim())) return { mode: "skip", text, reason, pieces };
  return { mode: "expand", text, reason, pieces };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Makes sure a Hindi voice gets Devanagari, never Urdu script (which it reads as silence). */
function forHindiVoice(text) {
  return hasArabicScript(text) ? urduToDevanagari(text) : text;
}

/**
 * Decides the voice and spoken text for one piece of a reply.
 * `hint` is the reply language from /api/assistant ("ur", "ur-Latn", "pa", "en", …):
 * a Latin-letter piece inside an Urdu reply (e.g. "DAP") stays with the Urdu voice,
 * so an Urdu answer is never read by an English voice.
 * Resolves to { voice, lang, rate, text, mode } — text "" means "cannot be spoken here".
 */
async function planPiece(text, hint, opts, prepare) {
  await voicesReady();
  const rate = opts.rate || 1;
  let lang = scriptLang(text);
  if (lang === "en" && URDU_FAMILY.has(hint) && hint !== "hi") lang = "ur-Latn-in-urdu";
  if (lang === "ur-Latn" && hint === "en") lang = "en";

  if (lang === "en") {
    const voice = pickVoice("en");
    return { voice, lang: voice?.lang || BCP.en, rate, text: englishSpeech(text), mode: "en" };
  }
  if (lang === "pa-Guru") {
    const voice = pickVoice("pa-Guru");
    if (voice) return { voice, lang: voice.lang, rate: rate * 0.95, text, mode: "pa" };
    const hi = pickVoice("hi");
    return hi
      ? { voice: hi, lang: hi.lang, rate: rate * 0.95, text, mode: "hindi" }
      : { voice: null, lang: BCP["pa-Guru"], rate, text: "", mode: "none" };
  }

  // Shahmukhi Punjabi: use a Pakistani Punjabi voice when the device has one, otherwise the Urdu voice.
  const paVoice = lang === "pa" && !opts.voiceURI ? pickVoice("pa-Arab") : null;
  const urdu = paVoice ? { mode: "native", voice: paVoice } : urduVoicePlan(opts.voiceURI);
  const base = { voice: urdu.voice, lang: urdu.voice?.lang || BCP.ur, rate: rate * 0.95, mode: urdu.mode };
  // Latin letters inside an Urdu reply (DAP, SOP) are spelled out by urduSpeech().
  const roman = lang === "ur-Latn";

  if (urdu.mode === "none") return { ...base, text: "" };

  if (urdu.mode === "hindi") {
    const src = urduSpeech(text);
    if (!prepare || (!hasArabicScript(src) && !roman)) return { ...base, text: forHindiVoice(src) };
    try {
      const converted = await cachedPrepare(prepare, src, "hi");
      return { ...base, text: forHindiVoice(converted) };
    } catch {
      return { ...base, text: forHindiVoice(src) };
    }
  }

  // Native Urdu voice.
  if (roman && prepare) {
    try {
      return { ...base, text: urduSpeech(await cachedPrepare(prepare, text, "ur")) };
    } catch {
      return { ...base, text };
    }
  }
  return { ...base, text: urduSpeech(text) };
}

/**
 * A sentence queue on top of speechSynthesis that keeps going when the
 * browser misbehaves:
 *  - every utterance stays referenced until it ends (Chrome otherwise garbage
 *    collects it and never fires `onend`, which used to freeze the queue and
 *    silence every later reply);
 *  - a watchdog moves on if an utterance never starts or never ends;
 *  - "not-allowed" (autoplay policy) is reported through onBlocked instead of
 *    being swallowed;
 *  - Urdu is never handed to an English voice (see planPiece).
 * Long sentences are split into pieces of at most ~180 characters to avoid
 * Chrome's ~15 s cut-off.
 *
 * Options:
 *  - prepare(text, target): async text conversion (see kisan.services.speechText).
 *  - getOptions(): { voiceURI?, rate? } read at speak time (from Settings).
 *  - onStart(): the first piece of a reply started playing.
 *  - onEnd(result): the reply finished (or was stopped). result =
 *      { spoken, skipped, blocked, failed, stopped } counts/flags.
 *  - onMissingVoice(lang, mode): once per language when no proper voice exists ("hindi" | "none").
 *  - onBlocked(): the browser refused to play speech without a tap.
 *  - synthesize(text): async → audio Blob of real Urdu speech (kisan.services.speechAudio).
 *    Used for Urdu, Roman Urdu and Shahmukhi Punjabi when the device has no Urdu voice.
 *    Text is sent in chunks of a few sentences; any failure falls back to the device's voices.
 */
export function createSpeaker({ onStart, onEnd, onMissingVoice, onBlocked, onCloudError, prepare, synthesize, getOptions } = {}) {
  let queue = [];
  let gen = 0;
  let runningGen = -1;
  let closed = true;
  let inReply = false; // something was enqueued since the last onEnd
  let speaking = false;
  let lastCancel = 0;
  let stats = null;
  let abortCurrent = null;
  const live = new Set(); // keep utterances alive (Chrome GC bug)
  const warned = {};
  let cloudBuf = "";
  let cloudLang = null;
  let cloudChunks = 0; // chunks sent for the current reply (the first is kept short for a quick start)
  const urls = new Set();

  const resetStats = () => {
    stats = { spoken: 0, skipped: 0, failed: 0, blocked: false, stopped: false, missing: null };
  };
  resetStats();

  const warn = (lang, mode) => {
    if (warned[lang + mode]) return;
    warned[lang + mode] = true;
    onMissingVoice?.(lang, mode);
  };

  const finish = () => {
    cloudChunks = 0;
    const result = { ...stats };
    speaking = false;
    inReply = false;
    resetStats();
    onEnd?.(result);
  };

  /** Plays one cloud audio chunk. Resolves to null on success or an error code. */
  const playCloud = (p) =>
    new Promise((resolve) => {
      const a = audioEl();
      let settled = false;
      const done = (err) => {
        if (settled) return;
        settled = true;
        a.onended = a.onerror = null;
        clearTimeout(timer);
        URL.revokeObjectURL(p.url);
        urls.delete(p.url);
        if (abortCurrent === abort) abortCurrent = null;
        resolve(err);
      };
      const abort = () => {
        a.pause();
        done("interrupted");
      };
      abortCurrent = abort;
      a.onended = () => done(null);
      a.onerror = () => done("synthesis-failed");
      // Upper bound so a lost `ended` event can never freeze the queue.
      const timer = setTimeout(() => done(null), 20000 + p.text.length * 200);
      a.src = p.url;
      a.playbackRate = Math.min(2, Math.max(0.5, p.rate || 1));
      const played = a.play();
      if (played?.catch) played.catch((e) => done(e?.name === "NotAllowedError" ? "not-allowed" : "synthesis-failed"));
    });

  /** Sends buffered Urdu text to the cloud voice as one chunk. */
  const flushCloud = (all) => {
    if (!cloudBuf.trim()) return;
    let chunk = cloudBuf;
    if (!all) {
      // Cut at the last sentence end that keeps the chunk within ~320 characters.
      const limit = cloudChunks === 0 ? 220 : 1200;
      const ends = [...cloudBuf.matchAll(/[۔.!?؟]\s+|\n/g)].map((m) => m.index + m[0].length).filter((i) => i <= limit);
      const cut = ends.length ? ends[ends.length - 1] : cloudBuf.length > limit ? cloudBuf.lastIndexOf(" ", limit) : -1;
      if (cut <= 0) return;
      chunk = cloudBuf.slice(0, cut);
    }
    cloudBuf = cloudBuf.slice(chunk.length);
    cloudChunks++;
    const opts = getOptions?.() || {};
    queue.push(
      planCloud(chunk.trim(), cloudLang, opts, prepare, synthesize).then((p) => {
        if (p.mode === "cloud") urls.add(p.url);
        else
          for (const piece of p.pieces || []) {
            if (piece.mode === "hindi" || piece.mode === "none") warn(cloudLang || scriptLang(piece.text), piece.mode);
            if (piece.mode === "none") stats.missing = cloudLang || scriptLang(piece.text);
          }
        return p;
      })
    );
    pump();
  };

  /** Speaks one utterance. Resolves to null on success or an error code. */
  const speakOne = (p) =>
    new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(p.text);
      if (p.voice) u.voice = p.voice;
      u.lang = p.lang;
      u.rate = Math.min(2, Math.max(0.5, p.rate || 1));
      live.add(u);
      let started = false;
      let settled = false;
      const timers = [];
      const done = (err) => {
        if (settled) return;
        settled = true;
        timers.forEach(clearTimeout);
        live.delete(u);
        if (abortCurrent === abort) abortCurrent = null;
        resolve(err);
      };
      const abort = () => done("interrupted");
      abortCurrent = abort;
      u.onstart = () => {
        started = true;
      };
      u.onend = () => done(null);
      u.onerror = (e) => done(e?.error || "synthesis-failed");
      // Some engines never fire onstart; if the synth reports it is speaking, count that.
      timers.push(
        setTimeout(() => {
          if (!started && !synth.speaking && !synth.pending) done("no-start");
        }, 6000)
      );
      // Upper bound so a lost `onend` can never freeze the queue.
      timers.push(setTimeout(() => done(started || synth.speaking ? null : "no-start"), 12000 + (p.text.length * 160) / u.rate));
      try {
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch {
        done("synthesis-failed");
      }
    });

  const pump = async () => {
    const myGen = gen;
    if (runningGen === myGen) return;
    runningGen = myGen;
    try {
      while (queue.length && myGen === gen) {
        const planned = await queue[0];
        if (myGen !== gen) return;
        queue.shift();
        if (planned.mode === "skip") {
          // Urdu speech unavailable: keep the answer as text, tell the page once per reply.
          if (!warned.cloud) {
            warned.cloud = true;
            onCloudError?.(planned.reason);
          }
          continue;
        }
        if (planned.mode === "expand") {
          // Cloud voice failed: speak this chunk with the device's voices instead.
          queue.unshift(...planned.pieces.map((x) => Promise.resolve(x)));
          continue;
        }
        if (!planned.text?.trim()) {
          stats.skipped++;
          continue;
        }
        if (!speaking) {
          speaking = true;
          onStart?.();
        }
        // Chrome drops an utterance spoken right after cancel().
        const since = performance.now() - lastCancel;
        if (since < 150) await sleep(150 - since);
        if (myGen !== gen) return;
        let err = planned.mode === "cloud" ? await playCloud(planned) : await speakOne(planned);
        if (err === "no-start" && myGen === gen && planned.mode !== "cloud") {
          window.speechSynthesis.cancel();
          lastCancel = performance.now();
          await sleep(200);
          if (myGen !== gen) return;
          err = await speakOne(planned);
        }
        if (myGen !== gen) return;
        if (err === "not-allowed") {
          stats.blocked = true;
          queue = [];
          onBlocked?.();
          break;
        }
        if (err && err !== "interrupted" && err !== "canceled") stats.failed++;
        else if (!err) stats.spoken++;
      }
    } finally {
      if (runningGen === myGen) runningGen = -1;
    }
    if (myGen === gen && !queue.length && closed && inReply) finish();
  };

  return {
    /** Adds text (one or more sentences, Markdown allowed). `lang` is the reply language, if known. */
    enqueue(text, { lang } = {}) {
      if (!ttsSupported()) return;
      const clean = speakableText(text);
      if (!clean) return;
      closed = false;
      inReply = true;
      const opts = getOptions?.() || {};
      if (wantsCloud(lang || scriptLang(clean), opts, synthesize) && scriptLang(clean) !== "pa-Guru") {
        // Real Urdu voice: buffer sentences and send a few at a time.
        cloudLang = lang || scriptLang(clean);
        cloudBuf += (cloudBuf ? " " : "") + clean.replace(/\n+/g, "\n");
        flushCloud(false);
        return;
      }
      // Plan each piece now so any server-side conversion starts in parallel.
      const pieces = clean
        .split("\n")
        .flatMap((line) => {
          const [sentences, rest] = takeSentences(line + " ");
          return rest.trim() ? [...sentences, rest.trim()] : sentences;
        })
        .flatMap(split);
      for (const piece of joinShort(pieces)) {
        queue.push(
          planPiece(piece, lang, opts, prepare).then((p) => {
            if (p.mode === "hindi" || p.mode === "none") warn(lang || scriptLang(piece), p.mode);
            if (p.mode === "none") stats.missing = lang || scriptLang(piece);
            return p;
          })
        );
      }
      pump();
    },
    /** Marks that no more text will arrive for this reply. */
    close() {
      flushCloud(true);
      closed = true;
      if (runningGen < 0 && !queue.length && inReply) finish();
    },
    /** Stops speech immediately and drops anything queued. */
    stop() {
      gen++;
      queue = [];
      cloudBuf = "";
      cloudChunks = 0;
      closed = true;
      abortCurrent?.();
      sharedAudio?.pause();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
      if (ttsSupported()) {
        window.speechSynthesis.cancel();
        lastCancel = performance.now();
      }
      if (inReply || speaking) {
        stats.stopped = true;
        finish();
      }
    },
    get speaking() {
      return speaking;
    },
  };
}

/** Joins neighbouring sentences into utterances of up to ~180 characters (each utterance ends with a pause). */
function joinShort(pieces, max = 180) {
  const out = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last && last.length + 1 + p.length <= max) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out;
}

function split(s) {
  if (s.length <= 200) return [s];
  const parts = [];
  let cur = "";
  for (const piece of s.split(/(?<=[,،؛;:])\s+|\s+(?=\S)/)) {
    if ((cur + " " + piece).length > 180 && cur) {
      parts.push(cur);
      cur = piece;
    } else cur = cur ? cur + " " + piece : piece;
  }
  if (cur) parts.push(cur);
  return parts;
}

let sampleSpeaker = null;
/** Speaks a short sample (Settings → "Test voice"). Returns the speaker. */
export function speakSample(text, opts = {}) {
  if (!ttsSupported()) return null;
  sampleSpeaker?.stop();
  sampleSpeaker = createSpeaker({ ...opts });
  sampleSpeaker.enqueue(text, { lang: opts.lang });
  sampleSpeaker.close();
  return sampleSpeaker;
}

let unlocked = false;
/**
 * iOS/Safari (and Chrome's autoplay policy) only allow speech after a user
 * gesture: call this inside a click handler. Speaking a silent utterance from
 * the gesture unlocks speech for the rest of the page's life.
 */
export function unlockSpeech() {
  if (!ttsSupported()) return;
  try {
    // Prime the shared <audio> element inside the tap, so cloud Urdu speech can play later (iOS).
    const a = audioEl();
    if (a && !unlocked) {
      a.src = SILENT_WAV;
      a.play()?.catch?.(() => {});
    }
  } catch {
    /* ignore */
  }
  try {
    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
    if (unlocked) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
    unlocked = true;
  } catch {
    /* ignore */
  }
}
